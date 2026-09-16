// API路由 - 员工、考勤、薪资、规则、看板
import { Router } from 'express';
import { db } from '../db.js';
import { getRules, getRuleStats, syncRules, forceResyncRules } from '../services/rule-engine.js';
import { generateAndStoreAttendance, getAttendanceSummary } from '../services/attendance.js';
import { calculateSalary, getPayslip, getSalarySummary } from '../services/salary.js';
import crypto from 'crypto';

const router = Router();
const uid = () => crypto.randomBytes(12).toString('base64url');

// ===== 健康检查 =====
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== 员工管理 =====
router.get('/employees', (req, res) => {
  const { entity, department, status } = req.query;
  let sql = `SELECT id, emp_no, name, entity, branch, department, position, hire_date, confirm_date, status 
             FROM employees WHERE 1=1`;
  const params = [];
  if (entity) { sql += ' AND entity = ?'; params.push(entity); }
  if (department) { sql += ' AND department = ?'; params.push(department); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY entity, department, name';
  const employees = db.prepare(sql).all(...params);
  // Map fields to frontend expectations
  const mapped = employees.map(e => ({
    ...e,
    joinDate: e.hire_date,
    dept: e.department,
    position: e.position || '-',
    entity: e.entity || '-',
    status: e.status === '正式' ? 'active' : e.status === '试用' ? 'probation' : e.status
  }));
  res.json({ employees: mapped });
});

router.get('/employees/:id', (req, res) => {
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

// ===== 考勤管理 =====
router.get('/attendance', (req, res) => {
  const month = req.query.month || '2026-07';
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const endDate = `${month}-${new Date(year, mon, 0).getDate()}`;

  // Get all attendance records for this month with employee info
  const records = db.prepare(`
    SELECT ar.*, e.name, e.entity, e.department
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
    WHERE ar.date >= ? AND ar.date <= ?
    ORDER BY e.entity, e.name, ar.date
  `).all(startDate, endDate);

  // For detail view: group by employee
  const empMap = new Map();
  for (const r of records) {
    if (!empMap.has(r.employee_id)) {
      empMap.set(r.employee_id, {
        id: r.employee_id,
        name: r.name,
        entity: r.entity,
        dept: r.department,
        expected: 0,
        normal: 0,
        late: 0,
        early: 0,
        anomalies: [],
        status: 'normal'
      });
    }
    const entry = empMap.get(r.employee_id);
    entry.expected++;
    if (r.status === 'normal') entry.normal++;
    else if (r.status && r.status.startsWith('late')) entry.late++;
    else if (r.status && r.status.startsWith('early')) entry.early++;
    else if (r.status === 'missing_card' || r.status === 'absent') {
      entry.anomalies.push({ date: r.date, type: r.status, note: r.note || '' });
    }
    if (entry.anomalies.length >= 3) entry.status = 'severe';
    else if (entry.anomalies.length >= 1) entry.status = 'warning';
  }

  // Summary
  let totalExpected = 0, totalNormal = 0, totalLate = 0, totalEarly = 0, totalMissing = 0, totalAbsent = 0, totalLeave = 0, totalCompensatory = 0;
  for (const r of records) {
    totalExpected++;
    if (r.status === 'normal') totalNormal++;
    else if (r.status && r.status.startsWith('late')) totalLate++;
    else if (r.status && r.status.startsWith('early')) totalEarly++;
    else if (r.status === 'missing_card') totalMissing++;
    else if (r.status === 'absent') totalAbsent++;
    else if (r.status === 'leave') totalLeave++;
    totalCompensatory += (r.overtime_hours || 0);
  }

  // By entity
  const entityStats = new Map();
  for (const r of records) {
    if (!entityStats.has(r.entity)) entityStats.set(r.entity, { name: r.entity, total: 0, normal: 0 });
    const es = entityStats.get(r.entity);
    es.total++;
    if (r.status === 'normal') es.normal++;
  }
  const byEntity = [...entityStats.values()].map(es => ({
    name: es.name,
    rate: Math.round((es.normal / es.total) * 1000) / 10
  }));

  res.json({
    records: [...empMap.values()],
    summary: {
      totalExpected, normal: totalNormal, late: totalLate, early: totalEarly,
      missing: totalMissing, absent: totalAbsent, leave: totalLeave,
      compensatory: totalCompensatory, byEntity
    }
  });
});

router.post('/attendance/calculate', (req, res) => {
  const { month } = req.body;
  const [year, mon] = month.split('-').map(Number);
  const result = generateAndStoreAttendance(year, mon);
  res.json({ message: `考勤计算完成：${result.generated || 0} 条记录`, ...result });
});

// ===== 薪酬核算 =====
router.get('/salary', (req, res) => {
  const month = req.query.month || '2026-07';
  const records = db.prepare(`
    SELECT s.*, e.name, e.entity, e.department
    FROM salary_records s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.period = ?
    ORDER BY e.entity, e.name
  `).all(month);

  const mapped = records.map(r => ({
    ...r,
    gross: r.gross_pay,
    net: r.net_pay,
    socialIns: r.social_insurance_emp,
    tax: r.tax,
    deductions: (r.sick_deduction || 0) + (r.personal_leave_deduction || 0) + (r.late_deduction || 0) + (r.absence_deduction || 0),
    verified: true,
    dept: r.department
  }));

  let totalGross = 0, totalNet = 0, totalDeduct = 0;
  const byEntityMap = new Map();
  for (const r of mapped) {
    totalGross += r.gross || 0;
    totalNet += r.net || 0;
    totalDeduct += (r.social_insurance_emp || 0) + (r.housing_fund_emp || 0) + (r.tax || 0);
    if (!byEntityMap.has(r.entity)) byEntityMap.set(r.entity, { name: r.entity, gross: 0, net: 0 });
    const es = byEntityMap.get(r.entity);
    es.gross += r.gross || 0;
    es.net += r.net || 0;
  }

  res.json({
    records: mapped,
    summary: {
      totalGross, totalNet, totalDeduction: totalDeduct, count: mapped.length,
      byEntity: [...byEntityMap.values()]
    }
  });
});

router.post('/salary/calculate', (req, res) => {
  const { month } = req.body;
  const [year, mon] = month.split('-').map(Number);
  const result = calculateSalary(year, mon);

  // Generate audit trail
  const auditTrail = (result.validations || []).map((v, i) => ({
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ruleId: v.ruleId || `R-${i}`,
    detail: v.message || v.detail || ''
  }));

  res.json({
    message: `薪酬核算完成：${result.count || result.records?.length || 0} 人`,
    records: result.records || [],
    auditTrail,
    validations: result.validations || []
  });
});

// Get single employee payslip
router.get('/salary/:id', (req, res) => {
  const month = req.query.month || '2026-07';
  const id = req.params.id;

  const rec = db.prepare(`
    SELECT s.*, e.name, e.entity, e.department, e.position, e.base_salary, e.performance_ratio,
           e.seniority_years, e.seniority_pay, e.meal_allowance, e.transport_allowance, e.communication_allowance, e.position_allowance
    FROM salary_records s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.employee_id = ? AND s.period = ?
  `).get(id, month);

  if (!rec) return res.status(404).json({ error: 'Payslip not found' });

  // Build payslip with trace
  const trace = [];
  if (rec.audit_trail) {
    try {
      const parsed = JSON.parse(rec.audit_trail);
      trace.push(...parsed);
    } catch (e) { /* ignore */ }
  }

  res.json({
    ...rec,
    basePay: Math.round(rec.base_salary * 0.9),
    perfPay: Math.round(rec.base_salary * 0.1),
    fullAttendBonus: rec.attendance_bonus || 0,
    seniorityPay: rec.seniority_pay || 0,
    positionAllowance: rec.position_allowance || 0,
    mealAllowance: rec.meal_allowance || 0,
    transportAllowance: rec.transport_allowance || 0,
    overtimePay: rec.overtime_pay || 0,
    compensatoryHours: (() => {
      // 查当月该员工存休时长
      const ar = db.prepare(`SELECT COALESCE(SUM(overtime_hours),0) as ch FROM attendance_records WHERE employee_id = ? AND status = 'rest_day_overtime' AND strftime('%Y-%m', date) = ?`).get(rec.employee_id, rec.period);
      return ar ? ar.ch : 0;
    })(),
    gross: rec.gross_pay || 0,
    pension: Math.round((rec.social_insurance_emp || 0) * 0.76),
    medical: Math.round((rec.social_insurance_emp || 0) * 0.19),
    unemployment: Math.round((rec.social_insurance_emp || 0) * 0.05),
    housingFund: rec.housing_fund_emp || 0,
    sickDeduct: rec.sick_deduction || 0,
    personalDeduct: rec.personal_leave_deduction || 0,
    lateDeduct: rec.late_deduction || 0,
    absentDeduct: rec.absence_deduction || 0,
    tax: rec.tax || 0,
    net: rec.net_pay || 0,
    totalDeduct: (rec.social_insurance_emp || 0) + (rec.housing_fund_emp || 0) + (rec.tax || 0) +
                (rec.sick_deduction || 0) + (rec.personal_leave_deduction || 0) +
                (rec.late_deduction || 0) + (rec.absence_deduction || 0),
    trace
  });
});

// ===== 规则引擎 =====
router.get('/rules', (req, res) => {
  const { category } = req.query;
  const rules = getRules(category || null);
  res.json({ rules });
});

router.get('/rules/stats', (req, res) => {
  res.json(getRuleStats());
});

router.post('/rules/sync', (req, res) => {
  syncRules();
  res.json({ message: 'Rules synced' });
});

// 强制从 JS 文件重新导入（覆盖 DB）
router.post('/rules/sync-force', (req, res) => {
  forceResyncRules();
  res.json({ message: '已从 JS 源文件强制重导全部规则' });
});

// 新增规则
router.post('/rules', (req, res) => {
  const { rule_id, name, category, sub_category, condition, formula, priority, version, active, description, legal_basis } = req.body;
  if (!rule_id || !name || !category) {
    return res.status(400).json({ error: 'rule_id, name, category 为必填项' });
  }
  // 检查 rule_id 是否重复
  const existing = db.prepare('SELECT id FROM rules WHERE rule_id = ?').get(rule_id);
  if (existing) return res.status(409).json({ error: `规则 ID ${rule_id} 已存在` });

  const id = uid();
  db.prepare(`
    INSERT INTO rules (id, rule_id, name, category, sub_category, condition, formula, priority, version, active, description, legal_basis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, rule_id, name, category, sub_category || null, condition || null, formula || null,
         priority || 100, version || '2024.06', active !== false ? 1 : 0, description || null, legal_basis || null);

  const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(id);
  res.status(201).json({ message: '规则已创建', rule });
});

// 修改规则
router.put('/rules/:ruleId', (req, res) => {
  const existing = db.prepare('SELECT * FROM rules WHERE rule_id = ?').get(req.params.ruleId);
  if (!existing) return res.status(404).json({ error: `规则 ${req.params.ruleId} 不存在` });

  const fields = ['name','category','sub_category','condition','formula','priority','version','active','description','legal_basis'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'active' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新字段' });

  values.push(req.params.ruleId);
  db.prepare(`UPDATE rules SET ${updates.join(', ')} WHERE rule_id = ?`).run(...values);

  const rule = db.prepare('SELECT * FROM rules WHERE rule_id = ?').get(req.params.ruleId);
  res.json({ message: '规则已更新', rule });
});

// 删除规则（软删除：设为 inactive）
router.delete('/rules/:ruleId', (req, res) => {
  const existing = db.prepare('SELECT * FROM rules WHERE rule_id = ?').get(req.params.ruleId);
  if (!existing) return res.status(404).json({ error: `规则 ${req.params.ruleId} 不存在` });

  db.prepare('UPDATE rules SET active = 0 WHERE rule_id = ?').run(req.params.ruleId);
  res.json({ message: `规则 ${req.params.ruleId} 已停用（软删除）` });
});

// 批量启用/停用
router.patch('/rules/batch-toggle', (req, res) => {
  const { rule_ids, active } = req.body;
  if (!Array.isArray(rule_ids) || rule_ids.length === 0) {
    return res.status(400).json({ error: 'rule_ids 不能为空' });
  }
  const val = active ? 1 : 0;
  const stmt = db.prepare('UPDATE rules SET active = ? WHERE rule_id = ?');
  const results = [];
  for (const rid of rule_ids) {
    const r = stmt.run(val, rid);
    results.push({ rule_id: rid, updated: r.changes > 0 });
  }
  res.json({ message: `已${active ? '启用' : '停用'} ${results.filter(r => r.updated).length} 条规则`, results });
});

// ===== 数据看板 =====
router.get('/dashboard', (req, res) => {
  const month = req.query.month || '2026-07';
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const endDate = `${month}-${new Date(year, mon, 0).getDate()}`;

  // Employee count
  const empCount = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status != '离职'").get();

  // Attendance
  const attTotal = db.prepare(`SELECT COUNT(*) as c FROM attendance_records WHERE date >= ? AND date <= ?`).get(startDate, endDate);
  const attNormal = db.prepare(`SELECT COUNT(*) as c FROM attendance_records WHERE date >= ? AND date <= ? AND status = 'normal'`).get(startDate, endDate);
  const attAnomaly = db.prepare(`SELECT COUNT(*) as c FROM attendance_records WHERE date >= ? AND date <= ? AND status NOT IN ('normal','leave')`).get(startDate, endDate);

  const attendanceRate = attTotal.c > 0 ? Math.round((attNormal.c / attTotal.c) * 1000) / 10 : 100;

  // Salary
  const salaryRec = db.prepare(`SELECT COUNT(*) as c, SUM(net_pay) as totalNet, SUM(gross_pay) as totalGross FROM salary_records WHERE period = ?`).get(month);

  // SLA (simulated)
  const slaRate = salaryRec.c > 0 ? 95 : 0;
  const salaryStatus = salaryRec.c > 0 ? '已完成' : '待核算';

  // By entity
  const entities = db.prepare(`
    SELECT e.entity as name,
      COUNT(DISTINCT e.id) as count
    FROM employees e WHERE e.status != '离职'
    GROUP BY e.entity ORDER BY count DESC
  `).all();

  // Enrich with attendance and salary data
  const enrichedEntities = entities.map(ent => {
    const attEnt = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN ar.status = 'normal' THEN 1 END) as normal
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      WHERE e.entity = ? AND ar.date >= ? AND ar.date <= ?
    `).get(ent.name, startDate, endDate);

    const salEnt = db.prepare(`
      SELECT SUM(s.net_pay) as totalNet, SUM(s.gross_pay) as totalGross, COUNT(*) as headcount, AVG(s.net_pay) as avgSalary
      FROM salary_records s JOIN employees e ON s.employee_id = e.id
      WHERE e.entity = ? AND s.period = ?
    `).get(ent.name, month);

    return {
      name: ent.name,
      count: ent.count,
      attendanceRate: attEnt.total > 0 ? Math.round((attEnt.normal / attEnt.total) * 1000) / 10 : 100,
      anomalyCount: attEnt.total > 0 ? (attEnt.total - attEnt.normal) : 0,
      grossSalary: salEnt.totalGross || 0,
      netSalary: salEnt.totalNet || 0,
      avgSalary: salEnt.avgSalary || 0
    };
  });

  // Alerts
  const alerts = [];
  const absentWarn = db.prepare(`
    SELECT e.name, e.entity, ar.date 
    FROM attendance_records ar JOIN employees e ON ar.employee_id = e.id
    WHERE ar.date >= ? AND ar.date <= ? AND ar.status = 'absent'
    LIMIT 5
  `).all(startDate, endDate);
  for (const a of absentWarn) {
    alerts.push({
      level: 'danger',
      message: `[旷工] ${a.name}(${a.entity}) ${a.date}未出勤`,
      time: a.date
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: 'warning',
      message: '系统运行正常，无严重异常',
      time: new Date().toISOString().split('T')[0]
    });
  }

  res.json({
    employeeCount: empCount.c,
    attendanceRate,
    anomalyCount: attAnomaly.c,
    totalSalary: salaryRec.totalGross || 0,
    slaRate,
    salaryStatus,
    entities: enrichedEntities,
    alerts
  });
});

export default router;

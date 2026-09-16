// 薪酬计算引擎 - 11步公式链、多维校验、薪资明细生成
import { db } from '../db.js';
import { nanoid } from 'nanoid';
import { calculateIIT, calculateDailyWage, calculateHourlyWage, getWorkingDays, logAudit } from './rule-engine.js';
import { processAttendance } from './attendance.js';

// 计算月度工资
export function calculateSalary(year, month) {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  
  // 先处理考勤
  const attendanceStats = processAttendance(year, month);
  
  const workingDays = getWorkingDays(year, month, 1); // 单休制
  const employees = db.prepare(`SELECT * FROM employees WHERE status != '离职'`).all();
  const results = [];
  const validations = [];

  for (const emp of employees) {
    const attStat = attendanceStats.find(a => a.employee_id === emp.id);
    if (!attStat) continue;

    const auditSteps = [];

    // Step 1: 岗位标准工资
    const performancePay = Math.round(emp.base_salary * emp.performance_ratio * 100) / 100;
    let standardSalary = Math.round((emp.base_salary + performancePay) * 100) / 100;
    
    // 试用期折算
    if (emp.status === '试用') {
      standardSalary = Math.round(standardSalary * 0.8 * 100) / 100;
      auditSteps.push({ step: 1, rule_id: 'R-SAL-004', description: '试用期80%折算', input: { base: emp.base_salary + performancePay }, output: { standard: standardSalary } });
    } else {
      auditSteps.push({ step: 1, rule_id: 'R-SAL-001', description: '岗位标准工资 = 基本+绩效', input: { base: emp.base_salary, performance: performancePay }, output: { standard: standardSalary } });
    }

    // Step 2: 日工资 & 时工资
    const dailyWage = calculateDailyWage(standardSalary);
    const hourlyWage = calculateHourlyWage(dailyWage);
    auditSteps.push({ step: 2, rule_id: 'R-SAL-002', description: `日工资 = ${standardSalary} / 21.75`, input: { standard: standardSalary }, output: { daily: dailyWage, hourly: hourlyWage } });

    // Step 3: 全勤奖
    const attendanceBonus = attStat.is_full_attendance ? 100 : 0;
    if (attendanceBonus > 0) {
      auditSteps.push({ step: 3, rule_id: 'R-SAL-010', description: '当月全勤，奖励100元', input: { is_full: attStat.is_full_attendance }, output: { bonus: 100 } });
    }

    // Step 4: 工龄工资
    const seniorityPay = emp.seniority_pay || 0;

    // Step 5: 各类补贴
    const mealAllowance = emp.meal_allowance || 0;
    const transportAllowance = emp.transport_allowance || 0;
    const communicationAllowance = emp.communication_allowance || 0;
    const positionAllowance = emp.position_allowance || 0;

    // Step 6: 加班费 — 按制度无加班费，仅公休日加班累积存休
    const overtimePay = 0; // 制度规定：加班不折算加班费，只存休
    auditSteps.push({ step: 6, rule_id: 'R-ATT-051', description: '加班无加班费，公休日加班累积存休', input: { compensatory_hours: attStat.total_compensatory_hours || 0 }, output: { overtime_pay: 0, compensatory: attStat.total_compensatory_hours || 0 } });

    // Step 7: 病假扣款
    let sickDeduction = 0;
    if (attStat.sick_leave_days > 0) {
      let payRatio;
      let ruleId;
      if (attStat.sick_leave_days <= 7) {
        payRatio = 0.8;
        ruleId = 'R-SAL-020/R-ATT-035';
      } else if (attStat.sick_leave_days <= 15) {
        payRatio = 0.5;
        ruleId = 'R-SAL-020/R-ATT-036';
      } else {
        payRatio = (2160 * 0.8) / dailyWage; // 最低工资80%
        ruleId = 'R-SAL-020/R-ATT-037';
      }
      sickDeduction = Math.round(dailyWage * (1 - payRatio) * attStat.sick_leave_days * 100) / 100;
      auditSteps.push({ step: 7, rule_id: ruleId, description: `病假${attStat.sick_leave_days}天，工资比例${(payRatio*100).toFixed(0)}%`, input: { days: attStat.sick_leave_days, daily: dailyWage, ratio: payRatio }, output: { deduction: sickDeduction } });
    }

    // Step 8: 事假扣款
    let personalLeaveDeduction = 0;
    if (attStat.personal_leave_days > 0) {
      personalLeaveDeduction = Math.round(dailyWage * attStat.personal_leave_days * 100) / 100;
      auditSteps.push({ step: 8, rule_id: 'R-SAL-021', description: `事假${attStat.personal_leave_days}天，扣日工资`, input: { days: attStat.personal_leave_days, daily: dailyWage }, output: { deduction: personalLeaveDeduction } });
    }

    // Step 9: 迟到/早退扣款
    const lateDeduction = attStat.total_late_deduction || 0;

    // Step 10: 旷工扣款
    let absenceDeduction = 0;
    if (attStat.absent_half_days > 0) {
      absenceDeduction = Math.round(dailyWage * 1.5 * attStat.absent_half_days * 100) / 100;
      auditSteps.push({ step: 10, rule_id: 'R-SAL-023', description: `旷工半天${attStat.absent_half_days}次，扣1.5倍日工资`, input: { half_days: attStat.absent_half_days, daily: dailyWage }, output: { deduction: absenceDeduction } });
    }

    // 应发工资
    const grossPay = Math.round((
      standardSalary + attendanceBonus + seniorityPay +
      mealAllowance + transportAllowance + communicationAllowance + positionAllowance -
      sickDeduction - personalLeaveDeduction - lateDeduction - absenceDeduction
    ) * 100) / 100;

    auditSteps.push({ step: 11, rule_id: 'R-SAL-030', description: '应发工资 = 标准+全勤+工龄+补贴-扣款（无加班费）', input: {}, output: { gross: grossPay } });

    // 社保个人部分
    const siBase = emp.social_insurance_base || standardSalary;
    const pensionEmp = Math.round(siBase * 0.08 * 100) / 100;
    const medicalEmp = Math.round(siBase * 0.02 * 100) / 100;
    const unemploymentEmp = Math.round(siBase * 0.003 * 100) / 100;
    const socialInsuranceEmp = Math.round((pensionEmp + medicalEmp + unemploymentEmp) * 100) / 100;

    // 公积金个人部分
    const hfBase = emp.housing_fund_base || standardSalary;
    const housingFundEmp = Math.round(hfBase * 0.05 * 100) / 100;

    // 个税（简化：按当月计算，不考虑累计）
    const tax = calculateIIT(grossPay - socialInsuranceEmp - housingFundEmp);

    // 实发工资
    const netPay = Math.round((grossPay - socialInsuranceEmp - housingFundEmp - tax) * 100) / 100;
    auditSteps.push({ step: 12, rule_id: 'R-SAL-090', description: '实发 = 应发 - 社保 - 公积金 - 个税', input: { gross: grossPay, si: socialInsuranceEmp, hf: housingFundEmp, tax }, output: { net: netPay } });

    // 校验
    if (netPay <= 0) {
      validations.push({ employee_id: emp.id, name: emp.name, type: 'warning', message: '实发工资为零或负数', value: netPay });
    }
    if (attStat.actual_days + attStat.leave_days + attStat.absent_days > workingDays) {
      validations.push({ employee_id: emp.id, name: emp.name, type: 'error', message: '考勤天数超过应出勤天数', value: `${attStat.actual_days + attStat.leave_days + attStat.absent_days} > ${workingDays}` });
    }

    // 记录审计轨迹
    logAudit('R-SAL-090', '2024.06', emp.id, period, {
      standard_salary: standardSalary,
      daily_wage: dailyWage,
      attendance: attStat,
      allowances: { meal: mealAllowance, transport: transportAllowance, communication: communicationAllowance, position: positionAllowance }
    }, {
      gross: grossPay,
      si: socialInsuranceEmp,
      hf: housingFundEmp,
      tax: tax,
      net: netPay
    }, `月度工资计算完成 - ${emp.name}`);

    // 存储工资记录
    const salaryId = nanoid();
    db.prepare(`
      INSERT OR REPLACE INTO salary_records 
      (id, employee_id, period, base_salary, performance_pay, attendance_bonus, seniority_pay,
       meal_allowance, transport_allowance, communication_allowance, position_allowance, overtime_pay,
       gross_pay, sick_deduction, personal_leave_deduction, late_deduction, absence_deduction,
       social_insurance_emp, housing_fund_emp, tax, net_pay, working_days, actual_days, status, audit_trail)
      VALUES (@id, @employee_id, @period, @base_salary, @performance_pay, @attendance_bonus, @seniority_pay,
       @meal_allowance, @transport_allowance, @communication_allowance, @position_allowance, @overtime_pay,
       @gross_pay, @sick_deduction, @personal_leave_deduction, @late_deduction, @absence_deduction,
       @social_insurance_emp, @housing_fund_emp, @tax, @net_pay, @working_days, @actual_days, @status, @audit_trail)
    `).run({
      id: salaryId,
      employee_id: emp.id,
      period: period,
      base_salary: emp.base_salary,
      performance_pay: performancePay,
      attendance_bonus: attendanceBonus,
      seniority_pay: seniorityPay,
      meal_allowance: mealAllowance,
      transport_allowance: transportAllowance,
      communication_allowance: communicationAllowance,
      position_allowance: positionAllowance,
      overtime_pay: overtimePay,
      gross_pay: grossPay,
      sick_deduction: sickDeduction,
      personal_leave_deduction: personalLeaveDeduction,
      late_deduction: lateDeduction,
      absence_deduction: absenceDeduction,
      social_insurance_emp: socialInsuranceEmp,
      housing_fund_emp: housingFundEmp,
      tax: tax,
      net_pay: netPay,
      working_days: workingDays,
      actual_days: attStat.actual_days,
      status: 'calculated',
      audit_trail: JSON.stringify(auditSteps)
    });

    results.push({
      employee_id: emp.id,
      name: emp.name,
      entity: emp.entity,
      department: emp.department,
      position: emp.position,
      period: period,
      base_salary: emp.base_salary,
      performance_pay: performancePay,
      standard_salary: standardSalary,
      daily_wage: dailyWage,
      attendance_bonus: attendanceBonus,
      seniority_pay: seniorityPay,
      meal_allowance: mealAllowance,
      transport_allowance: transportAllowance,
      communication_allowance: communicationAllowance,
      position_allowance: positionAllowance,
      overtime_pay: overtimePay,
      gross_pay: grossPay,
      sick_deduction: sickDeduction,
      personal_leave_deduction: personalLeaveDeduction,
      late_deduction: lateDeduction,
      absence_deduction: absenceDeduction,
      social_insurance_emp: socialInsuranceEmp,
      housing_fund_emp: housingFundEmp,
      tax: tax,
      net_pay: netPay,
      attendance: attStat,
      audit_steps: auditSteps
    });
  }

  console.log(`[Salary] Calculated ${results.length} employees for ${period}, ${validations.length} validations`);
  return { records: results, validations, period };
}

// 获取薪资明细（含审计轨迹）
export function getPayslip(employeeId, period) {
  const record = db.prepare(`
    SELECT s.*, e.name, e.emp_no, e.entity, e.department, e.position, e.bank_account
    FROM salary_records s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.employee_id = ? AND s.period = ?
  `).get(employeeId, period);

  if (!record) return null;

  const auditSteps = record.audit_trail ? JSON.parse(record.audit_trail) : [];
  return { ...record, audit_steps: auditSteps };
}

// 获取月度工资汇总
export function getSalarySummary(period) {
  return db.prepare(`
    SELECT s.*, e.name, e.emp_no, e.entity, e.department, e.position
    FROM salary_records s
    JOIN employees e ON s.employee_id = e.id
    WHERE s.period = ?
    ORDER BY e.entity, e.department, e.name
  `).all(period);
}

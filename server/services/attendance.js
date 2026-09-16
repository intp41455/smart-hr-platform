// 考勤处理引擎 - 自动采集、智能核对、异常分类、规则判定
import { db } from '../db.js';
import { nanoid } from 'nanoid';
import { getSeason, getWorkingDays, logAudit } from './rule-engine.js';

// 生成模拟打卡数据（演示用，实际应从钉钉API拉取）
export function generateMockAttendance(employeeId, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const season = getSeason(`${year}-${String(month).padStart(2, '0')}-01`);
  const scheduledStart = season === 'winter' ? '08:30' : '08:00';
  const scheduledEnd = season === 'winter' ? '17:30' : '17:00';
  const records = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // 单休制：周日休息。部分员工可能公休日加班（存休）
    if (dayOfWeek === 0) {
      // 约12%概率公休日加班（生成存休数据）
      const otRand = Math.random();
      if (otRand < 0.12) {
        const otHours = Math.floor(Math.random() * 4) + 4; // 4-7小时
        const clockInHour = 8 + Math.floor(Math.random() * 2); // 8:00或9:00开始
        const clockIn = `${String(clockInHour).padStart(2,'0')}:00`;
        const clockOutHour = clockInHour + otHours;
        const clockOut = `${String(clockOutHour).padStart(2,'0')}:00`;
        records.push({
          employee_id: employeeId,
          date: dateStr,
          shift_type: 'normal',
          scheduled_start: null,
          scheduled_end: null,
          clock_in: clockIn,
          clock_out: clockOut,
          status: 'rest_day_overtime',
          late_minutes: 0,
          early_leave_minutes: 0,
          overtime_hours: otHours,
          note: `公休日加班${otHours}小时（存休）`
        });
        continue;
      }
      
      records.push({
        employee_id: employeeId,
        date: dateStr,
        shift_type: 'normal',
        scheduled_start: null,
        scheduled_end: null,
        clock_in: null,
        clock_out: null,
        status: 'rest_day',
        late_minutes: 0,
        early_leave_minutes: 0,
        overtime_hours: 0,
        note: '休息日'
      });
      continue;
    }

    // 随机生成考勤情况
    const rand = Math.random();
    let clockIn = scheduledStart;
    let clockOut = scheduledEnd;
    let status = 'normal';
    let lateMin = 0;
    let earlyMin = 0;
    let note = '';

    if (rand < 0.02) {
      // 缺卡（无打卡无审批）
      status = 'missing_card';
      clockIn = null;
      clockOut = null;
      note = '无打卡记录，无审批单';
    } else if (rand < 0.05) {
      // 请假
      status = 'leave';
      clockIn = null;
      clockOut = null;
      const leaveTypes = ['事假', '病假', '年假', '调休'];
      note = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
    } else {
      // 正常打卡，可能有迟到/早退
      if (rand < 0.12) {
        // 迟到
        lateMin = Math.floor(Math.random() * 40) + 1;
        const [h, m] = scheduledStart.split(':').map(Number);
        const lateTime = h * 60 + m + lateMin;
        clockIn = `${String(Math.floor(lateTime / 60)).padStart(2, '0')}:${String(lateTime % 60).padStart(2, '0')}`;
        if (lateMin <= 5) { status = 'late_1'; note = `迟到${lateMin}分钟`; }
        else if (lateMin <= 15) { status = 'late_2'; note = `迟到${lateMin}分钟`; }
        else if (lateMin <= 30) { status = 'late_3'; note = `迟到${lateMin}分钟`; }
        else { status = 'absent_half'; note = `迟到${lateMin}分钟，按旷工半天处理`; }
      }
      if (rand > 0.93) {
        // 早退
        earlyMin = Math.floor(Math.random() * 35) + 1;
        const [h, m] = scheduledEnd.split(':').map(Number);
        const earlyTime = h * 60 + m - earlyMin;
        clockOut = `${String(Math.floor(earlyTime / 60)).padStart(2, '0')}:${String(earlyTime % 60).padStart(2, '0')}`;
        if (status === 'normal') {
          if (earlyMin <= 5) { status = 'early_1'; note = `早退${earlyMin}分钟`; }
          else if (earlyMin <= 15) { status = 'early_2'; note = `早退${earlyMin}分钟`; }
          else if (earlyMin <= 30) { status = 'early_3'; note = `早退${earlyMin}分钟`; }
          else { status = 'absent_half'; note = `早退${earlyMin}分钟，按旷工半天处理`; }
        }
      }
    }

    records.push({
      employee_id: employeeId,
      date: dateStr,
      shift_type: 'normal',
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      clock_in: clockIn,
      clock_out: clockOut,
      status: status,
      late_minutes: lateMin,
      early_leave_minutes: earlyMin,
      overtime_hours: 0,
      note: note
    });
  }

  return records;
}

// 批量生成并存储考勤数据
export function generateAndStoreAttendance(year, month) {
  const employees = db.prepare(`SELECT id, name FROM employees WHERE status != '离职'`).all();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO attendance_records 
    (id, employee_id, date, shift_type, scheduled_start, scheduled_end, clock_in, clock_out, status, late_minutes, early_leave_minutes, overtime_hours, note, processed)
    VALUES (@id, @employee_id, @date, @shift_type, @scheduled_start, @scheduled_end, @clock_in, @clock_out, @status, @late_minutes, @early_leave_minutes, @overtime_hours, @note, 0)
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (const emp of employees) {
      const records = generateMockAttendance(emp.id, year, month);
      for (const r of records) {
        insert.run({ id: nanoid(), ...r });
        count++;
      }
    }
  });
  tx();
  console.log(`[Attendance] Generated ${count} records for ${employees.length} employees, ${year}-${month}`);
  return { employees: employees.length, records: count };
}

// 处理考勤数据 - 规则引擎判定
export function processAttendance(year, month) {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = `${period}-01`;
  const endDate = `${period}-${new Date(year, month, 0).getDate()}`;
  
  const employees = db.prepare(`SELECT * FROM employees WHERE status != '离职'`).all();
  const results = [];

  for (const emp of employees) {
    const records = db.prepare(`
      SELECT * FROM attendance_records 
      WHERE employee_id = ? AND date >= ? AND date <= ?
      ORDER BY date
    `).all(emp.id, startDate, endDate);

    if (records.length === 0) continue;

    // 统计月度考勤
    const stats = {
      employee_id: emp.id,
      name: emp.name,
      period: period,
      total_days: records.length,
      normal_days: 0,
      late_count: 0,
      late_deduction: 0,
      early_leave_count: 0,
      early_leave_deduction: 0,
      missing_card_count: 0,
      absent_half_days: 0,
      absent_full_days: 0,
      sick_leave_days: 0,
      personal_leave_days: 0,
      annual_leave_days: 0,
      compensatory_leave_days: 0,
      compensatory_hours: 0,
      rest_days: 0,
      overtime_hours: 0,
      is_full_attendance: true,
      details: []
    };

    for (const r of records) {
      const dailyWage = emp.base_salary / 21.75;
      
      switch (r.status) {
        case 'normal':
          stats.normal_days++;
          break;
        case 'rest_day':
          stats.rest_days++;
          break;
        case 'rest_day_overtime':
          // 公休日加班：累积存休时长，不计加班费
          stats.rest_days++;
          stats.compensatory_hours += (r.overtime_hours || 0);
          logAudit('R-ATT-051', '2024.06', emp.id, period, { overtime_hours: r.overtime_hours }, { compensatory_hours: r.overtime_hours || 0 }, `公休日加班${r.overtime_hours||0}小时，存休${r.overtime_hours||0}小时`);
          break;
        case 'late_1':
          stats.late_count++;
          stats.late_deduction += 10;
          stats.is_full_attendance = false;
          logAudit('R-ATT-010', '2024.06', emp.id, period, { late_minutes: r.late_minutes }, { deduction: 10 }, `迟到${r.late_minutes}分钟，扣10元`);
          break;
        case 'late_2':
          stats.late_count++;
          stats.late_deduction += 30;
          stats.is_full_attendance = false;
          logAudit('R-ATT-011', '2024.06', emp.id, period, { late_minutes: r.late_minutes }, { deduction: 30 }, `迟到${r.late_minutes}分钟，扣30元`);
          break;
        case 'late_3':
          stats.late_count++;
          stats.late_deduction += 50;
          stats.is_full_attendance = false;
          logAudit('R-ATT-012', '2024.06', emp.id, period, { late_minutes: r.late_minutes }, { deduction: 50 }, `迟到${r.late_minutes}分钟，扣50元`);
          break;
        case 'early_1':
          stats.early_leave_count++;
          stats.early_leave_deduction += 10;
          stats.is_full_attendance = false;
          logAudit('R-ATT-015', '2024.06', emp.id, period, { early_minutes: r.early_leave_minutes }, { deduction: 10 }, `早退${r.early_leave_minutes}分钟，扣10元`);
          break;
        case 'early_2':
          stats.early_leave_count++;
          stats.early_leave_deduction += 30;
          stats.is_full_attendance = false;
          logAudit('R-ATT-016', '2024.06', emp.id, period, { early_minutes: r.early_leave_minutes }, { deduction: 30 }, `早退${r.early_leave_minutes}分钟，扣30元`);
          break;
        case 'early_3':
          stats.early_leave_count++;
          stats.early_leave_deduction += 50;
          stats.is_full_attendance = false;
          logAudit('R-ATT-017', '2024.06', emp.id, period, { early_minutes: r.early_leave_minutes }, { deduction: 50 }, `早退${r.early_leave_minutes}分钟，扣50元`);
          break;
        case 'absent_half':
          stats.absent_half_days++;
          stats.is_full_attendance = false;
          const halfDeduction = Math.round(dailyWage * 1.5 * 100) / 100;
          logAudit('R-ATT-020', '2024.06', emp.id, period, { daily_wage: dailyWage }, { deduction: halfDeduction }, `旷工半天，扣${halfDeduction}元`);
          break;
        case 'missing_card':
          stats.missing_card_count++;
          stats.is_full_attendance = false;
          break;
        case 'leave':
          if (r.note === '事假') { stats.personal_leave_days++; stats.is_full_attendance = false; }
          else if (r.note === '病假') { stats.sick_leave_days++; stats.is_full_attendance = false; }
          else if (r.note === '年假') { stats.annual_leave_days++; }
          else if (r.note === '调休') { stats.compensatory_leave_days++; }
          break;
      }
    }

    // 计算实际出勤天数
    stats.actual_days = stats.normal_days + stats.late_count + stats.early_leave_count;
    stats.total_late_deduction = stats.late_deduction + stats.early_leave_deduction;
    stats.absent_days = stats.absent_half_days * 0.5 + stats.absent_full_days;
    stats.leave_days = stats.sick_leave_days + stats.personal_leave_days + stats.annual_leave_days + stats.compensatory_leave_days;

    results.push(stats);
  }

  // 标记为已处理
  db.prepare(`UPDATE attendance_records SET processed = 1 WHERE date >= ? AND date <= ?`).run(startDate, endDate);
  
  console.log(`[Attendance] Processed ${results.length} employees for ${period}`);
  return results;
}

// 获取考勤汇总
export function getAttendanceSummary(period) {
  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const endDate = `${period}-${new Date(year, month, 0).getDate()}`;
  
  const employees = db.prepare(`
    SELECT e.id, e.name, e.entity, e.department, e.position,
      COUNT(CASE WHEN ar.status = 'normal' THEN 1 END) as normal_days,
      COUNT(CASE WHEN ar.status IN ('late_1','late_2','late_3') THEN 1 END) as late_count,
      COUNT(CASE WHEN ar.status IN ('early_1','early_2','early_3') THEN 1 END) as early_leave_count,
      COUNT(CASE WHEN ar.status = 'missing_card' THEN 1 END) as missing_card_count,
      COUNT(CASE WHEN ar.status = 'absent_half' THEN 1 END) as absent_half_days,
      COUNT(CASE WHEN ar.status = 'rest_day' THEN 1 END) as rest_days,
      COUNT(CASE WHEN ar.status = 'leave' AND ar.note = '事假' THEN 1 END) as personal_leave,
      COUNT(CASE WHEN ar.status = 'leave' AND ar.note = '病假' THEN 1 END) as sick_leave,
      COUNT(CASE WHEN ar.status = 'leave' AND ar.note = '年假' THEN 1 END) as annual_leave,
      SUM(ar.late_minutes) as total_late_minutes,
      SUM(ar.overtime_hours) as total_compensatory_hours
    FROM employees e
    LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.date >= ? AND ar.date <= ?
    WHERE e.status != '离职'
    GROUP BY e.id
    ORDER BY e.entity, e.department
  `).all(startDate, endDate);

  return employees;
}

// 获取异常列表
export function getAnomalies(period) {
  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const endDate = `${period}-${new Date(year, month, 0).getDate()}`;
  
  return db.prepare(`
    SELECT ar.*, e.name, e.entity, e.department, e.position
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
    WHERE ar.date >= ? AND ar.date <= ?
      AND ar.status NOT IN ('normal', 'rest_day', 'leave')
    ORDER BY ar.date DESC
  `).all(startDate, endDate);
}

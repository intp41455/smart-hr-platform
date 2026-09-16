// 康源集团考勤与薪酬规则引擎 - 规则定义库
// 基于康源发〔2024〕06号考勤管理制度及薪酬体系

export const ATTENDANCE_RULES = [
  // === 工时制度规则 ===
  { rule_id: 'R-ATT-001', name: '标准工时-冬令时', category: 'attendance', sub_category: 'worktime',
    condition: 'shift_type == "normal" && season == "winter"',
    formula: 'scheduled_start = "08:30"; scheduled_end = "17:30"; lunch_break = 60',
    priority: 10, version: '2024.06', active: 1,
    description: '冬令时（11月-4月）：8:30-17:30，午休1小时',
    legal_basis: '康源发〔2024〕06号 第三节第一条' },

  { rule_id: 'R-ATT-002', name: '标准工时-夏令时', category: 'attendance', sub_category: 'worktime',
    condition: 'shift_type == "normal" && season == "summer"',
    formula: 'scheduled_start = "08:00"; scheduled_end = "17:00"; lunch_break = 60',
    priority: 10, version: '2024.06', active: 1,
    description: '夏令时（5月-10月）：8:00-17:00，午休1小时',
    legal_basis: '康源发〔2024〕06号 第三节第一条' },

  { rule_id: 'R-ATT-003', name: '护理岗A班', category: 'attendance', sub_category: 'shift',
    condition: 'shift_type == "A"',
    formula: 'scheduled_start = "08:00"; scheduled_end = "16:00"',
    priority: 10, version: '2024.06', active: 1,
    description: 'A班：8:00-16:00',
    legal_basis: '康源发〔2024〕06号 第三节第二条' },

  { rule_id: 'R-ATT-004', name: '护理岗P班', category: 'attendance', sub_category: 'shift',
    condition: 'shift_type == "P"',
    formula: 'scheduled_start = "16:00"; scheduled_end = "24:00"',
    priority: 10, version: '2024.06', active: 1,
    description: 'P班：16:00-24:00',
    legal_basis: '康源发〔2024〕06号 第三节第二条' },

  { rule_id: 'R-ATT-005', name: '护理岗N班', category: 'attendance', sub_category: 'shift',
    condition: 'shift_type == "N"',
    formula: 'scheduled_start = "00:00"; scheduled_end = "08:00"; cross_midnight = true',
    priority: 10, version: '2024.06', active: 1,
    description: 'N班：0:00-8:00（跨午夜）',
    legal_basis: '康源发〔2024〕06号 第三节第二条' },

  // === 迟到规则 ===
  { rule_id: 'R-ATT-010', name: '迟到1级', category: 'attendance', sub_category: 'late',
    condition: 'late_minutes > 0 && late_minutes <= 5',
    formula: 'deduction = 10; status = "late"',
    priority: 20, version: '2024.06', active: 1,
    description: '迟到1-5分钟，扣款10元',
    legal_basis: '康源发〔2024〕06号 第四节第三条' },

  { rule_id: 'R-ATT-011', name: '迟到2级', category: 'attendance', sub_category: 'late',
    condition: 'late_minutes > 5 && late_minutes <= 15',
    formula: 'deduction = 30; status = "late"',
    priority: 21, version: '2024.06', active: 1,
    description: '迟到5-15分钟，扣款30元',
    legal_basis: '康源发〔2024〕06号 第四节第三条' },

  { rule_id: 'R-ATT-012', name: '迟到3级', category: 'attendance', sub_category: 'late',
    condition: 'late_minutes > 15 && late_minutes <= 30',
    formula: 'deduction = 50; status = "late"',
    priority: 22, version: '2024.06', active: 1,
    description: '迟到15-30分钟，扣款50元',
    legal_basis: '康源发〔2024〕06号 第四节第三条' },

  { rule_id: 'R-ATT-013', name: '迟到4级-旷工半天', category: 'attendance', sub_category: 'late',
    condition: 'late_minutes > 30',
    formula: 'deduction = daily_wage * 1.5; status = "absent_half"; absent_hours = 4',
    priority: 23, version: '2024.06', active: 1,
    description: '迟到超过30分钟，按旷工半天处理，扣1.5倍日工资',
    legal_basis: '康源发〔2024〕06号 第四节第三条' },

  // === 早退规则 ===
  { rule_id: 'R-ATT-015', name: '早退1级', category: 'attendance', sub_category: 'early_leave',
    condition: 'early_leave_minutes > 0 && early_leave_minutes <= 5',
    formula: 'deduction = 10; status = "early_leave"',
    priority: 20, version: '2024.06', active: 1,
    description: '早退1-5分钟，扣款10元',
    legal_basis: '康源发〔2024〕06号 第四节第四条' },

  { rule_id: 'R-ATT-016', name: '早退2级', category: 'attendance', sub_category: 'early_leave',
    condition: 'early_leave_minutes > 5 && early_leave_minutes <= 15',
    formula: 'deduction = 30; status = "early_leave"',
    priority: 21, version: '2024.06', active: 1,
    description: '早退5-15分钟，扣款30元',
    legal_basis: '康源发〔2024〕06号 第四节第四条' },

  { rule_id: 'R-ATT-017', name: '早退3级', category: 'attendance', sub_category: 'early_leave',
    condition: 'early_leave_minutes > 15 && early_leave_minutes <= 30',
    formula: 'deduction = 50; status = "early_leave"',
    priority: 22, version: '2024.06', active: 1,
    description: '早退15-30分钟，扣款50元',
    legal_basis: '康源发〔2024〕06号 第四节第四条' },

  { rule_id: 'R-ATT-018', name: '早退4级-旷工半天', category: 'attendance', sub_category: 'early_leave',
    condition: 'early_leave_minutes > 30',
    formula: 'deduction = daily_wage * 1.5; status = "absent_half"; absent_hours = 4',
    priority: 23, version: '2024.06', active: 1,
    description: '早退超过30分钟，按旷工半天处理',
    legal_basis: '康源发〔2024〕06号 第四节第四条' },

  // === 旷工规则 ===
  { rule_id: 'R-ATT-020', name: '旷工半天', category: 'attendance', sub_category: 'absence',
    condition: 'status == "absent_half"',
    formula: 'deduction = daily_wage * 1.5',
    priority: 30, version: '2024.06', active: 1,
    description: '旷工半天，扣1.5倍日工资',
    legal_basis: '康源发〔2024〕06号 第四节第五条' },

  { rule_id: 'R-ATT-021', name: '旷工1天', category: 'attendance', sub_category: 'absence',
    condition: 'status == "absent"',
    formula: 'deduction = daily_wage * 3',
    priority: 31, version: '2024.06', active: 1,
    description: '旷工1天，扣3倍日工资',
    legal_basis: '康源发〔2024〕06号 第四节第五条' },

  { rule_id: 'R-ATT-022', name: '连续旷工解除合同', category: 'attendance', sub_category: 'absence',
    condition: 'consecutive_absent_days >= 3 || annual_absent_days >= 5',
    formula: 'action = "terminate_contract"',
    priority: 50, version: '2024.06', active: 1,
    description: '连续旷工3天或年累计旷工5天，可解除劳动合同',
    legal_basis: '康源发〔2024〕06号 第四节第五条' },

  // === 补卡规则 ===
  { rule_id: 'R-ATT-025', name: '补卡上限', category: 'attendance', sub_category: 'makeup',
    condition: 'monthly_makeup_count > 3',
    formula: 'status = "missing_card"; deduction = daily_wage',
    priority: 25, version: '2024.06', active: 1,
    description: '每月补卡不超过3次，超次视为缺卡',
    legal_basis: '康源发〔2024〕06号 第四节第六条' },

  // === 全勤奖规则 ===
  { rule_id: 'R-ATT-030', name: '全勤奖', category: 'attendance', sub_category: 'bonus',
    condition: 'monthly_late_count == 0 && monthly_early_leave_count == 0 && monthly_missing_card == 0 && monthly_personal_leave == 0 && monthly_sick_leave == 0',
    formula: 'attendance_bonus = 100',
    priority: 40, version: '2024.06', active: 1,
    description: '当月无迟到/早退/缺卡/事假/病假，全勤奖100元',
    legal_basis: '康源发〔2024〕06号 第四节第七条' },

  // === 假期规则 ===
  { rule_id: 'R-ATT-035', name: '病假1级', category: 'attendance', sub_category: 'sick_leave',
    condition: 'sick_leave_days > 0 && sick_leave_days <= 7',
    formula: 'pay_ratio = 0.8; deduction = daily_wage * (1 - 0.8) * sick_leave_days',
    priority: 30, version: '2024.06', active: 1,
    description: '病假≤7天，按基本工资80%计发',
    legal_basis: '康源发〔2024〕06号 第五节第三条' },

  { rule_id: 'R-ATT-036', name: '病假2级', category: 'attendance', sub_category: 'sick_leave',
    condition: 'sick_leave_days > 7 && sick_leave_days <= 15',
    formula: 'pay_ratio = 0.5; deduction = daily_wage * (1 - 0.5) * sick_leave_days',
    priority: 31, version: '2024.06', active: 1,
    description: '病假7-15天，按基本工资50%计发',
    legal_basis: '康源发〔2024〕06号 第五节第三条' },

  { rule_id: 'R-ATT-037', name: '病假3级', category: 'attendance', sub_category: 'sick_leave',
    condition: 'sick_leave_days > 15',
    formula: 'pay_ratio = min_wage * 0.8 / daily_wage; deduction = daily_wage * (1 - pay_ratio) * sick_leave_days',
    priority: 32, version: '2024.06', active: 1,
    description: '病假>15天，按最低工资80%计发',
    legal_basis: '康源发〔2024〕06号 第五节第三条' },

  { rule_id: 'R-ATT-040', name: '事假', category: 'attendance', sub_category: 'personal_leave',
    condition: 'personal_leave_days > 0',
    formula: 'deduction = daily_wage * personal_leave_days',
    priority: 30, version: '2024.06', active: 1,
    description: '事假按日工资扣除',
    legal_basis: '康源发〔2024〕06号 第五节第二条' },

  { rule_id: 'R-ATT-041', name: '年假-工龄1-10年', category: 'attendance', sub_category: 'annual_leave',
    condition: 'work_years >= 1 && work_years < 10',
    formula: 'annual_leave_days = 5',
    priority: 30, version: '2024.06', active: 1,
    description: '工龄1-10年，年假5天',
    legal_basis: '康源发〔2024〕06号 第五节第四条' },

  { rule_id: 'R-ATT-042', name: '年假-工龄10-20年', category: 'attendance', sub_category: 'annual_leave',
    condition: 'work_years >= 10 && work_years < 20',
    formula: 'annual_leave_days = 10',
    priority: 31, version: '2024.06', active: 1,
    description: '工龄10-20年，年假10天',
    legal_basis: '康源发〔2024〕06号 第五节第四条' },

  { rule_id: 'R-ATT-043', name: '年假-工龄20年以上', category: 'attendance', sub_category: 'annual_leave',
    condition: 'work_years >= 20',
    formula: 'annual_leave_days = 15',
    priority: 32, version: '2024.06', active: 1,
    description: '工龄20年以上，年假15天',
    legal_basis: '康源发〔2024〕06号 第五节第四条' },

  // === 加班与存休规则 ===
  // 按制度：加班无加班费，仅公休日加班可累积存休（调休），工作日加班不计
  { rule_id: 'R-ATT-050', name: '工作日加班不计存休', category: 'attendance', sub_category: 'overtime',
    condition: 'overtime_type == "weekday"',
    formula: 'compensatory_hours = 0; note = "工作日加班不计存休"',
    priority: 40, version: '2024.06', active: 1,
    description: '工作日加班不计存休，不折算加班费',
    legal_basis: '康源发〔2024〕06号 加班管理制度' },

  { rule_id: 'R-ATT-051', name: '公休日加班存休', category: 'attendance', sub_category: 'overtime',
    condition: 'overtime_type == "rest_day"',
    formula: 'compensatory_hours = overtime_hours; compensatory_pay = 0',
    priority: 41, version: '2024.06', active: 1,
    description: '公休日加班1小时=存休1小时，不折算加班费',
    legal_basis: '康源发〔2024〕06号 加班管理制度' },

  { rule_id: 'R-ATT-052', name: '存休使用规则', category: 'attendance', sub_category: 'overtime',
    condition: 'leave_type == "compensatory"',
    formula: 'compensatory_balance -= leave_days * 8; note = "调休消耗存休"',
    priority: 42, version: '2024.06', active: 1,
    description: '调休假消耗已累积存休时长，不可跨公司使用',
    legal_basis: '康源发〔2024〕06号 加班管理制度' },

  { rule_id: 'R-ATT-053', name: '存休有效期', category: 'attendance', sub_category: 'overtime',
    condition: 'always',
    formula: 'compensatory_expiry = current_year_end; unused_hours_expire',
    priority: 43, version: '2024.06', active: 1,
    description: '存休当年有效，年底清零，不可折现',
    legal_basis: '康源发〔2024〕06号 加班管理制度' },
];

export const SALARY_RULES = [
  // === 薪酬结构规则 ===
  { rule_id: 'R-SAL-001', name: '岗位标准工资', category: 'salary', sub_category: 'structure',
    condition: 'always',
    formula: 'standard_salary = base_salary + base_salary * performance_ratio',
    priority: 10, version: '2024.06', active: 1,
    description: '岗位标准工资 = 基本工资 + 绩效工资（基本×绩效比例）',
    legal_basis: '薪酬管理制度 第一节' },

  { rule_id: 'R-SAL-002', name: '日工资计算', category: 'salary', sub_category: 'structure',
    condition: 'always',
    formula: 'daily_wage = standard_salary / 21.75',
    priority: 11, version: '2024.06', active: 1,
    description: '日工资 = 岗位标准工资 / 21.75（月计薪天数）',
    legal_basis: '劳动法 第五十一条' },

  { rule_id: 'R-SAL-003', name: '时工资计算', category: 'salary', sub_category: 'structure',
    condition: 'always',
    formula: 'hourly_wage = daily_wage / 8',
    priority: 12, version: '2024.06', active: 1,
    description: '时工资 = 日工资 / 8',
    legal_basis: '劳动法 第五十一条' },

  { rule_id: 'R-SAL-004', name: '试用期薪资', category: 'salary', sub_category: 'structure',
    condition: 'employee.status == "试用"',
    formula: 'actual_salary = standard_salary * 0.8',
    priority: 15, version: '2024.06', active: 1,
    description: '试用期按岗位标准工资80%发放',
    legal_basis: '试用期与晋升代理期管理 第三节' },

  // === 全勤奖 ===
  { rule_id: 'R-SAL-010', name: '全勤奖计算', category: 'salary', sub_category: 'bonus',
    condition: 'attendance.is_full_attendance == true',
    formula: 'attendance_bonus = 100',
    priority: 20, version: '2024.06', active: 1,
    description: '全勤奖100元/月',
    legal_basis: '康源发〔2024〕06号 第四节第七条' },

  // === 工龄工资 ===
  { rule_id: 'R-SAL-015', name: '工龄工资', category: 'salary', sub_category: 'seniority',
    condition: 'always',
    formula: 'seniority_pay = seniority_pay_config',
    priority: 20, version: '2024.06', active: 1,
    description: '按入职年限阶梯计算工龄工资',
    legal_basis: '薪酬管理制度 第三节' },

  // === 扣款规则 ===
  { rule_id: 'R-SAL-020', name: '病假扣款', category: 'salary', sub_category: 'deduction',
    condition: 'attendance.sick_leave_days > 0',
    formula: 'sick_deduction = daily_wage * (1 - sick_pay_ratio) * sick_leave_days',
    priority: 30, version: '2024.06', active: 1,
    description: '病假扣款 = 日工资 × (1-病假工资比例) × 病假天数',
    legal_basis: '康源发〔2024〕06号 第五节第三条' },

  { rule_id: 'R-SAL-021', name: '事假扣款', category: 'salary', sub_category: 'deduction',
    condition: 'attendance.personal_leave_days > 0',
    formula: 'personal_leave_deduction = daily_wage * personal_leave_days',
    priority: 31, version: '2024.06', active: 1,
    description: '事假扣款 = 日工资 × 事假天数',
    legal_basis: '康源发〔2024〕06号 第五节第二条' },

  { rule_id: 'R-SAL-022', name: '迟到扣款', category: 'salary', sub_category: 'deduction',
    condition: 'attendance.total_late_deduction > 0',
    formula: 'late_deduction = attendance.total_late_deduction',
    priority: 32, version: '2024.06', active: 1,
    description: '迟到扣款汇总（4级梯度）',
    legal_basis: '康源发〔2024〕06号 第四节第三条' },

  { rule_id: 'R-SAL-023', name: '旷工扣款', category: 'salary', sub_category: 'deduction',
    condition: 'attendance.absence_days > 0',
    formula: 'absence_deduction = daily_wage * 3 * absence_days + daily_wage * 1.5 * absence_half_days',
    priority: 33, version: '2024.06', active: 1,
    description: '旷工扣款 = 日工资×3×全天 + 日工资×1.5×半天',
    legal_basis: '康源发〔2024〕06号 第四节第五条' },

  // === 应发工资 ===
  { rule_id: 'R-SAL-030', name: '应发工资', category: 'salary', sub_category: 'gross',
    condition: 'always',
    formula: 'gross_pay = actual_salary + attendance_bonus + seniority_pay + meal_allowance + transport_allowance + communication_allowance + position_allowance - sick_deduction - personal_leave_deduction - late_deduction - absence_deduction - other_deduction',
    priority: 50, version: '2024.06', active: 1,
    description: '应发工资 = 标准工资 + 全勤 + 工龄 + 各类补贴 - 各类扣款（加班无加班费，仅公休日存休）',
    legal_basis: '薪酬管理制度 第五节' },

  // === 社保公积金 ===
  { rule_id: 'R-SAL-040', name: '养老保险-单位', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'pension_employer = social_insurance_base * 0.16',
    priority: 40, version: '2024.06', active: 1,
    description: '养老单位16%',
    legal_basis: '陕人社发〔2024〕12号' },

  { rule_id: 'R-SAL-041', name: '养老保险-个人', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'pension_employee = social_insurance_base * 0.08',
    priority: 41, version: '2024.06', active: 1,
    description: '养老个人8%',
    legal_basis: '陕人社发〔2024〕12号' },

  { rule_id: 'R-SAL-042', name: '医疗保险-单位', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'medical_employer = social_insurance_base * 0.08',
    priority: 42, version: '2024.06', active: 1,
    description: '医疗单位8%',
    legal_basis: '陕医保发〔2024〕8号' },

  { rule_id: 'R-SAL-043', name: '医疗保险-个人', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'medical_employee = social_insurance_base * 0.02',
    priority: 43, version: '2024.06', active: 1,
    description: '医疗个人2%',
    legal_basis: '陕医保发〔2024〕8号' },

  { rule_id: 'R-SAL-044', name: '失业保险-单位', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'unemployment_employer = social_insurance_base * 0.007',
    priority: 44, version: '2024.06', active: 1,
    description: '失业单位0.7%',
    legal_basis: '陕人社发〔2024〕12号' },

  { rule_id: 'R-SAL-045', name: '失业保险-个人', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'unemployment_employee = social_insurance_base * 0.003',
    priority: 45, version: '2024.06', active: 1,
    description: '失业个人0.3%',
    legal_basis: '陕人社发〔2024〕12号' },

  { rule_id: 'R-SAL-046', name: '工伤保险-单位', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'injury_employer = social_insurance_base * 0.0032',
    priority: 46, version: '2024.06', active: 1,
    description: '工伤单位0.32%',
    legal_basis: '陕人社发〔2024〕12号' },

  { rule_id: 'R-SAL-047', name: '公积金-单位', category: 'salary', sub_category: 'housing_fund',
    condition: 'always',
    formula: 'fund_employer = housing_fund_base * 0.05',
    priority: 47, version: '2024.06', active: 1,
    description: '公积金单位5%',
    legal_basis: '西安公积金管理办法' },

  { rule_id: 'R-SAL-048', name: '公积金-个人', category: 'salary', sub_category: 'housing_fund',
    condition: 'always',
    formula: 'fund_employee = housing_fund_base * 0.05',
    priority: 48, version: '2024.06', active: 1,
    description: '公积金个人5%',
    legal_basis: '西安公积金管理办法' },

  { rule_id: 'R-SAL-049', name: '社保个人合计', category: 'salary', sub_category: 'social_insurance',
    condition: 'always',
    formula: 'social_insurance_emp = pension_employee + medical_employee + unemployment_employee',
    priority: 49, version: '2024.06', active: 1,
    description: '社保个人部分合计 = 养老+医疗+失业',
    legal_basis: '社保法' },

  // === 个人所得税 ===
  { rule_id: 'R-SAL-060', name: '个税-累计预扣预缴', category: 'salary', sub_category: 'tax',
    condition: 'always',
    formula: 'tax = calculate_iit(gross_pay, accumulated_income, accumulated_deduction, tax_brackets)',
    priority: 60, version: '2024.06', active: 1,
    description: '累计预扣预缴法，起征点5000元/月，7级累进税率',
    legal_basis: '个人所得税法 第六条' },

  // === 实发工资 ===
  { rule_id: 'R-SAL-090', name: '实发工资', category: 'salary', sub_category: 'net',
    condition: 'always',
    formula: 'net_pay = gross_pay - social_insurance_emp - housing_fund_emp - tax - other_deduction',
    priority: 90, version: '2024.06', active: 1,
    description: '实发工资 = 应发 - 社保个人 - 公积金个人 - 个税 - 其他扣款',
    legal_basis: '薪酬管理制度 第六节' },

  // === 月中入职/离职 ===
  { rule_id: 'R-SAL-095', name: '月中入职折算', category: 'salary', sub_category: 'proration',
    condition: 'hire_month == current_period',
    formula: 'actual_days = working_days - day_of_month(hire_date) + 1; proration_ratio = actual_days / working_days; standard_salary *= proration_ratio',
    priority: 15, version: '2024.06', active: 1,
    description: '月中入职按天折算',
    legal_basis: '劳动法 第五十一条' },

  { rule_id: 'R-SAL-096', name: '月中离职折算', category: 'salary', sub_category: 'proration',
    condition: 'leave_month == current_period',
    formula: 'actual_days = day_of_month(leave_date); proration_ratio = actual_days / working_days; standard_salary *= proration_ratio',
    priority: 15, version: '2024.06', active: 1,
    description: '月中离职按天折算',
    legal_basis: '劳动法 第五十一条' },
];

export const VALIDATION_RULES = [
  { rule_id: 'R-VAL-001', name: '考勤天数校验', category: 'validation',
    condition: 'always',
    formula: 'assert(actual_days + leave_days + absent_days == working_days, "考勤天数不匹配")',
    priority: 100, version: '2024.06', active: 1,
    description: '实际出勤+请假+旷工 = 应出勤天数',
    legal_basis: '系统校验' },

  { rule_id: 'R-VAL-002', name: '工资波动校验', category: 'validation',
    condition: 'always',
    formula: 'assert(abs(net_pay - last_month_net_pay) / last_month_net_pay < 0.3, "工资波动超30%")',
    priority: 100, version: '2024.06', active: 1,
    description: '当月工资与上月波动不超过30%',
    legal_basis: '系统校验' },

  { rule_id: 'R-VAL-003', name: '零工资校验', category: 'validation',
    condition: 'always',
    formula: 'assert(net_pay > 0, "实发工资为零")',
    priority: 100, version: '2024.06', active: 1,
    description: '实发工资必须大于0',
    legal_basis: '系统校验' },

  { rule_id: 'R-VAL-004', name: '社保基数校验', category: 'validation',
    condition: 'always',
    formula: 'assert(social_insurance_base >= min_wage && social_insurance_base <= max_base, "社保基数异常")',
    priority: 100, version: '2024.06', active: 1,
    description: '社保基数在上下限范围内',
    legal_basis: '社保法' },
];

export const ALL_RULES = [...ATTENDANCE_RULES, ...SALARY_RULES, ...VALIDATION_RULES];

// 个税税率表（累计预扣预缴）
export const TAX_BRACKETS = [
  { upper: 36000, rate: 0.03, deduction: 0 },
  { upper: 144000, rate: 0.10, deduction: 2520 },
  { upper: 300000, rate: 0.20, deduction: 16920 },
  { upper: 420000, rate: 0.25, deduction: 31920 },
  { upper: 660000, rate: 0.30, deduction: 52920 },
  { upper: 960000, rate: 0.35, deduction: 85920 },
  { upper: Infinity, rate: 0.45, deduction: 181920 },
];

// 月计薪天数
export const MONTHLY_WORKING_DAYS = 21.75;

// 最低工资标准（陕西省2024年）
export const MIN_WAGE_MONTHLY = 2160;
export const MIN_WAGE_HOURLY = 21;

// 种子数据 - 康源集团模拟员工数据（基于实际组织架构）
import { db, initDB } from './db.js';
import { syncRules } from './services/rule-engine.js';
import { nanoid } from 'nanoid';

const ENTITIES = [
  '康源福祉教育科技有限公司',
  '上海康源博曜养老服务公司',
  '康源美宏养老服务有限公司',
  '康源中成养老服务有限公司'
];

const BRANCHES = [
  '西安总部', '曲靖分公司', '成都分公司', '德州分公司', '陵城项目部',
  '西安康养中心', '曲靖康养中心', '成都康养中心'
];

const DEPARTMENTS = ['行政中心', '财务部', '人力资源部', '护理部', '后勤部', '医务部', '运营部', '市场部'];

const POSITIONS = [
  { title: '总经理', base: 15000, allow: 3000 },
  { title: '副总经理', base: 12000, allow: 2500 },
  { title: '部门总监', base: 10000, allow: 2000 },
  { title: '部门经理', base: 8000, allow: 1500 },
  { title: '行政专员', base: 5000, allow: 500 },
  { title: '人事专员', base: 5000, allow: 500 },
  { title: '财务专员', base: 5500, allow: 500 },
  { title: '护士长', base: 7000, allow: 1200 },
  { title: '护士', base: 5500, allow: 800 },
  { title: '护理员', base: 4500, allow: 600 },
  { title: '护理员组长', base: 5200, allow: 700 },
  { title: '医生', base: 9000, allow: 1500 },
  { title: '康复师', base: 6500, allow: 800 },
  { title: '厨师', base: 4800, allow: 400 },
  { title: '保洁员', base: 3800, allow: 300 },
  { title: '保安', base: 4000, allow: 300 },
  { title: '司机', base: 4500, allow: 400 },
];

const NAMES = [
  '王建国','李明华','张秀英','刘志强','陈丽萍','杨建军','赵淑芬','黄国栋',
  '周晓燕','吴文斌','徐慧敏','孙伟杰','马春兰','朱建华','胡晓东','郭美玲',
  '何志远','高玉兰','林国华','谢丽娟','罗建平','宋秀芳','唐明辉','韩雪梅',
  '冯国强','邓晓芳','曹永明','彭春花','田伟刚','董淑琴','袁建军','潘晓燕',
  '于秀英','蒋文明','魏丽华','余国强','王海燕','李建军','张美华','刘晓东',
  '陈国栋','杨秀英','赵明华','黄丽萍','周建国','吴淑芬','徐志强','马丽娟',
  '朱晓东','胡建华','郭春兰','何美玲','高志远','林淑芬','谢建军','罗晓燕',
  '宋国华','唐秀芳','韩明辉','冯丽华','邓永明','彭春兰','田淑琴','董晓东',
  '袁丽娟','潘建军','于明华','蒋国栋','魏秀英','余志强','王春花','李晓燕'
];

function randomDate(startYear, startMonth, endYear, endMonth) {
  const start = new Date(startYear, startMonth - 1, 1);
  const end = new Date(endYear, endMonth - 1, 28);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function seedEmployees() {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO employees 
    (id, emp_no, name, entity, branch, department, position, hire_date, confirm_date, status, 
     base_salary, performance_ratio, meal_allowance, transport_allowance, communication_allowance, 
     position_allowance, seniority_years, seniority_pay, social_insurance_base, housing_fund_base)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  let empNo = 1001;
  
  // 为每个主体生成员工
  for (const entity of ENTITIES) {
    const entityBranches = BRANCHES.slice(0, 4 + Math.floor(Math.random() * 3));
    const empCount = 15 + Math.floor(Math.random() * 10); // 每个主体15-24人
    
    for (let i = 0; i < empCount; i++) {
      const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      const branch = entityBranches[Math.floor(Math.random() * entityBranches.length)];
      const hireDate = randomDate(2020, 1, 2025, 6);
      const hireYear = new Date(hireDate).getFullYear();
      const seniorityYears = new Date().getFullYear() - hireYear;
      const statusRoll = Math.random();
      let status = '正式';
      if (statusRoll < 0.05) status = '试用';
      else if (statusRoll < 0.08) status = '实习';
      else if (statusRoll < 0.10) status = '劳务';
      
      const baseSalary = pos.base + Math.floor(Math.random() * 1000);
      const siBase = Math.max(2160, Math.min(baseSalary, 21000));
      const hfBase = Math.max(2160, Math.min(baseSalary, 28000));
      const seniorityPay = seniorityYears >= 3 ? (seniorityYears >= 5 ? 300 : 150) : 0;

      insert.run(
        nanoid(),
        `KY${empNo++}`,
        name,
        entity,
        branch,
        dept,
        pos.title,
        hireDate,
        status === '正式' ? randomDate(hireYear, 7, hireYear + 1, 6) : null,
        status,
        baseSalary,
        0.1,
        pos.allow * 0.3,
        pos.allow * 0.3,
        pos.allow * 0.2,
        pos.allow * 0.2,
        seniorityYears,
        seniorityPay,
        siBase,
        hfBase
      );
    }
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM employees').get();
  console.log(`[Seed] Inserted ${count.c} employees`);
  return count.c;
}

function seedLeaveRecords() {
  const employees = db.prepare('SELECT id FROM employees').all();
  const leaveTypes = [
    { type: '年假', days: 3 },
    { type: '事假', days: 1 },
    { type: '病假', days: 2 },
    { type: '调休', days: 1 },
  ];

  const insert = db.prepare(`
    INSERT INTO leave_records (id, employee_id, type, start_date, end_date, days, reason, approved_by, status)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);

  let count = 0;
  for (const emp of employees) {
    if (Math.random() < 0.3) {
      const leave = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const startDate = randomDate(2025, 6, 2025, 7);
      const endDate = new Date(new Date(startDate).getTime() + leave.days * 86400000).toISOString().split('T')[0];
      insert.run(nanoid(), emp.id, leave.type, startDate, endDate, leave.days, leave.type + '申请', '部门经理', 'approved');
      count++;
    }
  }
  console.log(`[Seed] Inserted ${count} leave records`);
}

// 主函数
function main() {
  console.log('开始种子数据初始化...\n');
  initDB();
  syncRules();
  
  // 清空现有数据
  db.exec('DELETE FROM attendance_records');
  db.exec('DELETE FROM salary_records');
  db.exec('DELETE FROM leave_records');
  db.exec('DELETE FROM audit_trail');
  
  const empCount = seedEmployees();
  seedLeaveRecords();
  
  console.log(`\n种子数据初始化完成！`);
  console.log(`  员工: ${empCount}人`);
  console.log(`  规则: 已同步`);
  console.log(`\n可启动服务器: npm run dev`);
}

main();

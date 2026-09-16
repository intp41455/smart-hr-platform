// 规则引擎执行器 - 加载规则、匹配条件、执行计算、记录审计轨迹
import { db } from '../db.js';
import { nanoid } from 'nanoid';
import { ALL_RULES, TAX_BRACKETS, MONTHLY_WORKING_DAYS, MIN_WAGE_MONTHLY } from '../rules.js';

// 同步规则到数据库（仅首次：DB空时从JS导入，后续以DB为准）
export function syncRules() {
  const count = db.prepare('SELECT COUNT(*) as c FROM rules').get();
  if (count.c > 0) {
    console.log(`[Rules] DB 已有 ${count.c} 条规则，跳过 JS 导入（以 DB 为准）`);
    return;
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO rules (id, rule_id, name, category, sub_category, condition, formula, priority, version, active, description, legal_basis)
    VALUES (@id, @rule_id, @name, @category, @sub_category, @condition, @formula, @priority, @version, @active, @description, @legal_basis)
  `);
  for (const rule of ALL_RULES) {
    insert.run({
      id: nanoid(),
      rule_id: rule.rule_id,
      name: rule.name,
      category: rule.category,
      sub_category: rule.sub_category || null,
      condition: rule.condition || null,
      formula: rule.formula || null,
      priority: rule.priority || 100,
      version: rule.version || '2024.06',
      active: rule.active || 1,
      description: rule.description || null,
      legal_basis: rule.legal_basis || null,
    });
  }
  console.log(`[Rules] 首次导入：${ALL_RULES.length} 条规则已写入数据库`);
}

// 强制从 JS 重新导入（覆盖 DB 中已有规则）
export function forceResyncRules() {
  db.prepare('DELETE FROM rules').run();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO rules (id, rule_id, name, category, sub_category, condition, formula, priority, version, active, description, legal_basis)
    VALUES (@id, @rule_id, @name, @category, @sub_category, @condition, @formula, @priority, @version, @active, @description, @legal_basis)
  `);
  for (const rule of ALL_RULES) {
    insert.run({
      id: nanoid(),
      rule_id: rule.rule_id,
      name: rule.name,
      category: rule.category,
      sub_category: rule.sub_category || null,
      condition: rule.condition || null,
      formula: rule.formula || null,
      priority: rule.priority || 100,
      version: rule.version || '2024.06',
      active: rule.active || 1,
      description: rule.description || null,
      legal_basis: rule.legal_basis || null,
    });
  }
  console.log(`[Rules] 强制重导：${ALL_RULES.length} 条规则已覆写数据库`);
}

// 记录审计轨迹
export function logAudit(ruleId, ruleVersion, employeeId, period, inputData, outputData, description) {
  db.prepare(`
    INSERT INTO audit_trail (id, rule_id, rule_version, employee_id, period, input_data, output_data, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nanoid(), ruleId, ruleVersion, employeeId, period, JSON.stringify(inputData), JSON.stringify(outputData), description);
}

// 计算个税（累计预扣预缴法）
export function calculateIIT(monthlyIncome, accumulatedIncome = 0, accumulatedTaxPaid = 0, accumulatedSpecialDeduction = 0) {
  const monthlyThreshold = 5000;
  const monthlyTaxable = Math.max(0, monthlyIncome - monthlyThreshold - accumulatedSpecialDeduction);
  const accumulatedTaxable = accumulatedIncome + monthlyTaxable;
  
  let accumulatedTax = 0;
  for (const bracket of TAX_BRACKETS) {
    if (accumulatedTaxable <= bracket.upper) {
      accumulatedTax = accumulatedTaxable * bracket.rate - bracket.deduction;
      break;
    }
  }
  
  const currentMonthTax = Math.max(0, accumulatedTax - accumulatedTaxPaid);
  return Math.round(currentMonthTax * 100) / 100;
}

// 计算日工资
export function calculateDailyWage(standardSalary) {
  return Math.round((standardSalary / MONTHLY_WORKING_DAYS) * 100) / 100;
}

// 计算时工资
export function calculateHourlyWage(dailyWage) {
  return Math.round((dailyWage / 8) * 100) / 100;
}

// 判断季节（冬令时/夏令时）
export function getSeason(date) {
  const month = new Date(date).getMonth() + 1;
  return (month >= 5 && month <= 10) ? 'summer' : 'winter';
}

// 获取指定月份的应出勤天数（简化版：排除周末，单休制按6天/周）
export function getWorkingDays(year, month, restDayPerWeek = 1) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    // 单休制：每周休息1天（周日）
    if (restDayPerWeek === 1) {
      if (dayOfWeek !== 0) workingDays++;
    } else {
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
    }
  }
  return workingDays;
}

// 获取规则列表
export function getRules(category = null) {
  if (category) {
    return db.prepare('SELECT * FROM rules WHERE category = ? ORDER BY priority').all(category);
  }
  return db.prepare('SELECT * FROM rules ORDER BY category, priority').all();
}

// 获取规则统计
export function getRuleStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM rules').get();
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM rules GROUP BY category').all();
  const byVersion = db.prepare('SELECT version, COUNT(*) as count FROM rules GROUP BY version').all();
  return { total: total.count, byCategory, byVersion };
}

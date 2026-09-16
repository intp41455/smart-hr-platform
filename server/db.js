import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'hr_platform_v2.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      emp_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      entity TEXT NOT NULL,
      branch TEXT,
      department TEXT,
      position TEXT,
      hire_date TEXT NOT NULL,
      confirm_date TEXT,
      status TEXT NOT NULL DEFAULT '正式',
      base_salary REAL NOT NULL DEFAULT 0,
      performance_ratio REAL NOT NULL DEFAULT 0.1,
      meal_allowance REAL DEFAULT 0,
      transport_allowance REAL DEFAULT 0,
      communication_allowance REAL DEFAULT 0,
      position_allowance REAL DEFAULT 0,
      seniority_years INTEGER DEFAULT 0,
      seniority_pay REAL DEFAULT 0,
      social_insurance_base REAL DEFAULT 0,
      housing_fund_base REAL DEFAULT 0,
      bank_account TEXT,
      id_card TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT DEFAULT 'normal',
      scheduled_start TEXT,
      scheduled_end TEXT,
      clock_in TEXT,
      clock_out TEXT,
      status TEXT DEFAULT 'normal',
      late_minutes INTEGER DEFAULT 0,
      early_leave_minutes INTEGER DEFAULT 0,
      absent_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      leave_type TEXT,
      leave_hours REAL DEFAULT 0,
      note TEXT,
      rule_id TEXT,
      rule_version TEXT,
      processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS leave_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days REAL NOT NULL,
      reason TEXT,
      approved_by TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS salary_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      period TEXT NOT NULL,
      base_salary REAL DEFAULT 0,
      performance_pay REAL DEFAULT 0,
      attendance_bonus REAL DEFAULT 0,
      seniority_pay REAL DEFAULT 0,
      meal_allowance REAL DEFAULT 0,
      transport_allowance REAL DEFAULT 0,
      communication_allowance REAL DEFAULT 0,
      position_allowance REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      gross_pay REAL DEFAULT 0,
      sick_deduction REAL DEFAULT 0,
      personal_leave_deduction REAL DEFAULT 0,
      late_deduction REAL DEFAULT 0,
      absence_deduction REAL DEFAULT 0,
      other_deduction REAL DEFAULT 0,
      social_insurance_emp REAL DEFAULT 0,
      housing_fund_emp REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      working_days INTEGER DEFAULT 0,
      actual_days REAL DEFAULT 0,
      status TEXT DEFAULT 'calculated',
      audit_trail TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, period)
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      rule_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      condition TEXT,
      formula TEXT,
      priority INTEGER DEFAULT 100,
      version TEXT DEFAULT '2024.06',
      active INTEGER DEFAULT 1,
      description TEXT,
      legal_basis TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      rule_version TEXT,
      employee_id TEXT,
      period TEXT,
      input_data TEXT,
      output_data TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
    CREATE INDEX IF NOT EXISTS idx_salary_emp_period ON salary_records(employee_id, period);
    CREATE INDEX IF NOT EXISTS idx_salary_period ON salary_records(period);
    CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);
  `);
  console.log('[DB] Database initialized');
  return db;
}

export { db };

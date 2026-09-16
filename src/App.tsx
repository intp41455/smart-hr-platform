import React, { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Salary from './pages/Salary'
import Employees from './pages/Employees'
import Rules from './pages/Rules'
import Payslip from './pages/Payslip'

const API = '/api'
const navItems = [
  { id: 'dashboard',  label: '数据看板', icon: '📊' },
  { id: 'attendance', label: '考勤管理', icon: '📋' },
  { id: 'salary',     label: '薪酬核算', icon: '💰' },
  { id: 'employees',  label: '员工管理', icon: '👥' },
  { id: 'rules',      label: '规则引擎', icon: '⚙️' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [selectedMonth, setSelectedMonth] = useState('2026-07')
  const [stats, setStats] = useState<any>(null)
  const [payslipEmployee, setPayslipEmployee] = useState<any>(null)

  useEffect(() => { fetchStats() }, [selectedMonth])

  async function fetchStats() {
    try {
      const res = await fetch(`${API}/dashboard?month=${selectedMonth}`)
      const data = await res.json()
      setStats(data)
    } catch (e) { /* ignore */ }
  }

  function renderPage() {
    const props = { selectedMonth, setSelectedMonth, API }
    switch (page) {
      case 'dashboard':  return <Dashboard stats={stats} {...props} />
      case 'attendance': return <Attendance {...props} />
      case 'salary':     return <Salary {...props} />
      case 'employees':  return <Employees {...props} onSelect={e => { setPayslipEmployee(e); setPage('payslip') }} />
      case 'rules':      return <Rules {...props} />
      case 'payslip':    return <Payslip employee={payslipEmployee} onBack={() => setPage('employees')} {...props} />
      default:           return <Dashboard stats={stats} {...props} />
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-800 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-brand-500/15">
              K
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">康源智慧人资</h1>
              <p className="text-[11px] text-gray-400">Smart HR Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 group flex items-center gap-3 ${
                  active
                    ? 'bg-brand-50 text-brand-600 font-medium border border-brand-100 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom - Month selector + user */}
        <div className="p-3 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 block">核算月份</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            >
              {['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08'].map(m => (
                <option key={m} value={m}>{m.replace('-','年')}月</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
              R
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">任贤达</p>
              <p className="text-[10px] text-gray-400">人事总监</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="animate-fade-in" key={page}>
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

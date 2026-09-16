import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Salary({ selectedMonth, API }: any) {
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [auditTrail, setAuditTrail] = useState<any[]>([])
  const [statusMsg, setStatusMsg] = useState('')

  const fetchSalary = useCallback(async () => {
    const res = await fetch(`${API}/salary?month=${selectedMonth}`)
    const data = await res.json()
    setRecords(data.records || [])
    setSummary(data.summary)
  }, [selectedMonth])

  useEffect(() => { fetchSalary() }, [fetchSalary])

  async function runAutoCalc() {
    setRunning(true)
    setStatusMsg('正在拉取考勤数据...')
    try {
      const res = await fetch(`${API}/salary/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      })
      const data = await res.json()
      setAuditTrail(data.auditTrail || [])
      setStatusMsg(data.message || '薪酬计算完成')
      fetchSalary()
    } catch (e) { setStatusMsg('计算失败，请检查后端服务') }
    finally { setRunning(false) }
  }

  const colClass = "py-3 px-3 whitespace-nowrap"

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">薪酬核算</h2>
          <p className="text-sm text-gray-400 mt-0.5">考勤联动 · 自动计算 · 多维校验</p>
        </div>
        <button
          onClick={runAutoCalc}
          disabled={running}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 ${
            running
              ? 'bg-gray-300 cursor-wait'
              : 'bg-brand-500 hover:bg-brand-600 active:scale-95 shadow-md shadow-brand-200'
          }`}
        >
          {running ? '⏳ 核算中...' : '▶ 自动核算工资'}
        </button>
      </div>

      {/* Status */}
      {statusMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm border font-medium ${
          statusMsg.includes('完成') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          statusMsg.includes('失败') ? 'bg-rose-50 border-rose-200 text-rose-700' :
          'bg-brand-50 border-brand-200 text-brand-700'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '应发总额',   value: '¥' + (summary.totalGross / 10000).toFixed(1) + '万', icon: '📤', color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
            { label: '实发总额',   value: '¥' + (summary.totalNet / 10000).toFixed(1) + '万',   icon: '💵', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: '社保公积金', value: '¥' + (summary.totalDeduction / 10000).toFixed(1) + '万', icon: '🏦', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: '核算人数',   value: summary.count + '人',                                  icon: '👥', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
          ].map((c, i) => (
            <div key={i} className={`${c.bg} rounded-2xl p-4 border ${c.border} hover:shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{c.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {summary && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">各主体薪酬分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.byEntity || []} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => `¥${(v/10000).toFixed(1)}万`}
                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="gross" name="应发" fill="#f97316" radius={[6,6,0,0]} maxBarSize={48} />
              <Bar dataKey="net" name="实发" fill="#10b981" radius={[6,6,0,0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty */}
      {!summary && !running && (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <span className="text-4xl block mb-3">💰</span>
          <p className="text-gray-500 text-sm">暂无薪酬数据</p>
          <p className="text-gray-300 text-xs mt-1">请先运行「自动核算工资」</p>
        </div>
      )}

      {/* Table */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className={`text-left ${colClass} font-semibold`}>姓名</th>
                  <th className={`text-left ${colClass} font-semibold`}>主体</th>
                  <th className={`text-right ${colClass} font-semibold`}>应发</th>
                  <th className={`text-right ${colClass} font-semibold`}>社保</th>
                  <th className={`text-right ${colClass} font-semibold`}>个税</th>
                  <th className={`text-right ${colClass} font-semibold`}>扣款</th>
                  <th className={`text-right ${colClass} font-semibold`}>实发</th>
                  <th className={`text-right ${colClass} font-semibold w-16`}>校验</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 50).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className={`${colClass} font-medium text-gray-800`}>{r.name}</td>
                    <td className={`${colClass} text-gray-500`}>{r.entity}</td>
                    <td className={`${colClass} text-right text-brand-600 font-mono text-xs font-medium`}>¥{r.gross?.toLocaleString()}</td>
                    <td className={`${colClass} text-right text-amber-600 font-mono text-xs`}>¥{r.socialIns?.toLocaleString()}</td>
                    <td className={`${colClass} text-right text-rose-500 font-mono text-xs`}>¥{r.tax?.toLocaleString()}</td>
                    <td className={`${colClass} text-right text-rose-500 font-mono text-xs`}>¥{r.deductions?.toLocaleString()}</td>
                    <td className={`${colClass} text-right font-bold text-emerald-600 font-mono text-xs`}>¥{r.net?.toLocaleString()}</td>
                    <td className={`${colClass} text-right`}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-500 border border-rose-200'
                      }`}>{r.verified ? '✓ 通过' : '⚠ 异常'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit trail */}
      {auditTrail.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🔍</span>
            <h3 className="font-semibold text-gray-800">审计轨迹</h3>
            <span className="text-xs text-gray-400 ml-auto">{auditTrail.length} 条记录</span>
          </div>
          <div className="space-y-1 max-h-60 overflow-auto text-xs font-mono">
            {auditTrail.slice(0, 30).map((a: any, i: number) => (
              <div key={i} className="flex gap-3 text-gray-500 py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-gray-400 shrink-0">{a.time}</span>
                <span className="text-brand-600 font-medium shrink-0">{a.ruleId}</span>
                <span className="flex-1">{a.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

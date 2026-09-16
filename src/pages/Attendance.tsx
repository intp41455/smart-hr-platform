import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Attendance({ selectedMonth, setSelectedMonth, API }: any) {
  const [records, setRecords] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [view, setView] = useState<'summary' | 'detail'>('summary')
  const [statusMsg, setStatusMsg] = useState('')

  const fetchRecords = useCallback(async () => {
    const res = await fetch(`${API}/attendance?month=${selectedMonth}`)
    const data = await res.json()
    setRecords(data.records || [])
    setSummary(data.summary)
  }, [selectedMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function runAutoCalc() {
    setRunning(true)
    setStatusMsg('正在从钉钉拉取打卡数据...')
    try {
      const res = await fetch(`${API}/attendance/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      })
      const data = await res.json()
      setStatusMsg(data.message || '考勤计算完成')
      fetchRecords()
    } catch (e) { setStatusMsg('计算失败，请检查后端服务') }
    finally { setRunning(false) }
  }

  const statCards = summary ? [
    { label: '应打卡', value: summary.totalExpected, color: 'text-gray-700' },
    { label: '正常',   value: summary.normal,         color: 'text-emerald-600' },
    { label: '迟到',   value: summary.late,           color: 'text-amber-600' },
    { label: '早退',   value: summary.early,          color: 'text-brand-500' },
    { label: '缺卡',   value: summary.missing,        color: 'text-rose-500' },
    { label: '旷工',   value: summary.absent,         color: 'text-red-500' },
    { label: '请假',   value: summary.leave,          color: 'text-cyan-600' },
    { label: '存休',   value: (summary.compensatory || 0) + 'h', color: 'text-violet-600' },
  ] : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">考勤管理</h2>
          <p className="text-sm text-gray-400 mt-0.5">智能采集 · 自动核对 · 异常预警</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'summary' ? 'detail' : 'summary')}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
          >
            {view === 'summary' ? '明细列表' : '汇总统计'}
          </button>
          <button
            onClick={runAutoCalc}
            disabled={running}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 ${
              running
                ? 'bg-gray-300 cursor-wait'
                : 'bg-brand-500 hover:bg-brand-600 active:scale-95 shadow-md shadow-brand-200'
            }`}
          >
            {running ? '⏳ 计算中...' : '▶ 自动计算考勤'}
          </button>
        </div>
      </div>

      {/* Status message */}
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
      {summary && view === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {statCards.map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 border border-gray-100 text-center hover:border-brand-100 hover:shadow-sm transition-all">
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-[11px] text-gray-400 mt-1 font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {summary && view === 'summary' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">各核算主体出勤率对比</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.byEntity || []} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[75, 100]} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                }}
                labelStyle={{ color: '#111827', fontWeight: 600 }}
                formatter={(v: number) => [`${v}%`, '出勤率']}
              />
              <Bar dataKey="rate" radius={[6,6,0,0]} maxBarSize={48}>
                {(summary.byEntity || []).map((_: any, i: number) => (
                  <Cell key={i} fill={_.rate >= 95 ? '#10b981' : _.rate >= 90 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!summary && !running && (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <span className="text-4xl block mb-3">📋</span>
          <p className="text-gray-500 text-sm">暂无考勤数据</p>
          <p className="text-gray-300 text-xs mt-1">点击「自动计算考勤」开始</p>
        </div>
      )}

      {/* Detail table */}
      {view === 'detail' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">姓名</th>
                  <th className="text-left font-semibold">主体</th>
                  <th className="text-left font-semibold">部门</th>
                  <th className="text-center font-semibold w-16">应打卡</th>
                  <th className="text-center font-semibold w-16">正常</th>
                  <th className="text-center font-semibold w-16">迟到</th>
                  <th className="text-center font-semibold w-16">异常</th>
                  <th className="text-center font-semibold w-20">结果</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 50).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{r.name}</td>
                    <td className="text-gray-500">{r.entity}</td>
                    <td className="text-gray-500">{r.dept}</td>
                    <td className="text-center text-gray-600">{r.expected}</td>
                    <td className="text-center text-emerald-600 font-medium">{r.normal}</td>
                    <td className="text-center text-amber-600 font-medium">{r.late || '—'}</td>
                    <td className="text-center">
                      {(r.anomalies || []).length > 0 ? (
                        <span className="text-rose-500 font-medium">{(r.anomalies || []).length}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        r.status === 'normal' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        r.status === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        {r.status === 'normal' ? '正常' : r.status === 'warning' ? '关注' : '严重'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <div className="p-12 text-center text-gray-400">暂无记录，请先运行自动计算</div>
          )}
        </div>
      )}
    </div>
  )
}

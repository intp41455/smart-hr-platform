import React, { useState, useEffect } from 'react'

interface Props { stats: any; selectedMonth: string; setSelectedMonth: (m: string) => void; API: string }

export default function Dashboard({ stats, API }: Props) {
  const [data, setData] = useState<any>(stats)

  useEffect(() => { if (stats) setData(stats) }, [stats])

  if (!data) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">正在加载看板数据...</p>
      </div>
    </div>
  )

  const cards = [
    { label: '总员工数',     value: data.employeeCount,              sub: '人',   icon: '👥', gradient: 'from-brand-50 to-amber-50' },
    { label: '出勤率',       value: data.attendanceRate + '%',        sub: null,  icon: '✅', gradient: 'from-emerald-50 to-teal-50' },
    { label: '异常人数',     value: data.anomalyCount,                sub: '人',   icon: '⚠️', gradient: 'from-rose-50 to-red-50' },
    { label: '本月人工成本', value: '¥' + (data.totalSalary / 10000).toFixed(1), sub: '万', icon: '💰', gradient: 'from-brand-50 to-pink-50' },
    { label: 'SLA 达成率',   value: data.slaRate + '%',               sub: null,  icon: '🎯', gradient: 'from-cyan-50 to-blue-50' },
    { label: '薪酬状态',     value: data.salaryStatus || '待核算',     sub: null,  icon: '📊', gradient: 'from-violet-50 to-purple-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">数据看板</h2>
          <p className="text-sm text-gray-400 mt-0.5">集团人资运营数据总览</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium border border-brand-100">
          实时更新
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <div
            key={i}
            className="relative group bg-white rounded-2xl p-4 border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{c.icon}</span>
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {c.value}
                {c.sub && <span className="text-sm font-normal text-gray-400 ml-0.5">{c.sub}</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1.5">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by entity */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">各核算主体考勤概览</h3>
            <span className="text-xs text-gray-400">当月累计</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left py-2.5 font-medium">核算主体</th>
                <th className="text-right py-2.5 font-medium w-16">人数</th>
                <th className="text-right py-2.5 font-medium w-20">出勤率</th>
                <th className="text-right py-2.5 font-medium w-16">异常</th>
              </tr>
            </thead>
            <tbody>
              {(data.entities || []).map((e: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 text-gray-700 font-medium">{e.name}</td>
                  <td className="text-right text-gray-500">{e.count}</td>
                  <td className="text-right">
                    <span className={`inline-flex items-center gap-1 font-mono text-xs font-medium ${
                      e.attendanceRate >= 95 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {e.attendanceRate >= 95 ? '●' : '●'} {e.attendanceRate}%
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={e.anomalyCount > 0 ? 'text-rose-500 font-medium' : 'text-gray-300'}>
                      {e.anomalyCount > 0 ? e.anomalyCount : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Salary Summary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">薪酬汇总</h3>
            <span className="text-xs text-gray-400">当月累计</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left py-2.5 font-medium">核算主体</th>
                <th className="text-right py-2.5 font-medium">应发合计</th>
                <th className="text-right py-2.5 font-medium">实发合计</th>
                <th className="text-right py-2.5 font-medium w-20">人均</th>
              </tr>
            </thead>
            <tbody>
              {(data.entities || []).map((e: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 text-gray-700 font-medium">{e.name}</td>
                  <td className="text-right text-brand-600 font-mono text-xs font-medium">
                    ¥{(e.grossSalary/10000).toFixed(1)}万
                  </td>
                  <td className="text-right text-emerald-600 font-mono text-xs font-medium">
                    ¥{(e.netSalary/10000).toFixed(1)}万
                  </td>
                  <td className="text-right text-gray-500 font-mono text-xs">
                    ¥{e.avgSalary?.toFixed(0) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomaly alerts */}
      {(data.alerts || []).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="font-semibold text-rose-600">异常预警</h3>
            <span className="text-xs text-rose-400 ml-auto">{data.alerts.length} 条</span>
          </div>
          <div className="space-y-2">
            {(data.alerts || []).slice(0, 5).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  a.level === 'danger' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <span className="text-gray-700 flex-1">{a.message}</span>
                <span className="text-gray-400 text-xs">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for alerts */}
      {(!data.alerts || data.alerts.length === 0) && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <span className="text-3xl block mb-2">✅</span>
          <p className="text-gray-500 text-sm">当前无异常预警</p>
          <p className="text-gray-300 text-xs mt-1">系统运行正常</p>
        </div>
      )}
    </div>
  )
}

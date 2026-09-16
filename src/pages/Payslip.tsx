import React, { useState, useEffect } from 'react'

export default function Payslip({ employee, selectedMonth, API, onBack }: any) {
  const [slip, setSlip] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employee) return
    setLoading(true)
    fetch(`${API}/salary/${employee.id}?month=${selectedMonth}`)
      .then(r => r.json())
      .then(data => { setSlip(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [employee, selectedMonth])

  if (!employee) return null

  const lineClass = "flex justify-between py-3 border-b border-gray-50 last:border-0"
  const labelClass = "text-gray-500 text-sm"
  const valueClass = "font-mono text-sm text-gray-700 font-medium"

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-500 text-sm font-medium transition-colors"
      >
        ← 返回员工列表
      </button>

      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">正在加载工资单...</p>
        </div>
      ) : slip ? (
        <div className="space-y-5">
          {/* Employee info card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-brand-200">
                {employee.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
                  <span>{selectedMonth.replace('-', '年')}月工资单</span>
                  <span className="text-gray-200">|</span>
                  <span>{employee.entity}</span>
                  <span className="text-gray-200">|</span>
                  <span>{employee.dept} · {employee.position}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-800">应发项目</h3>
            </div>
            {[
              ['岗位标准工资', slip.baseSalary],
              ['基本工资 (90%)', slip.basePay],
              ['绩效工资 (10%)', slip.perfPay],
              ['全勤奖', slip.fullAttendBonus],
              ['工龄工资', slip.seniorityPay],
              ['岗位补贴', slip.positionAllowance],
              ['餐补', slip.mealAllowance],
              ['交通补贴', slip.transportAllowance],
              ['公休日存休', slip.overtimePay > 0 ? `¥${slip.overtimePay?.toLocaleString()}` : (slip.compensatoryHours || 0) + ' 小时'],
            ].map(([label, val], i) => (
              <div key={i} className={lineClass}>
                <span className={labelClass}>{label}</span>
                <span className={valueClass}>
                  {typeof val === 'number' && val > 0 ? `¥${val?.toLocaleString()}` : typeof val === 'string' ? val : '—'}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 mt-2 border-t-2 border-brand-100 font-bold text-lg">
              <span className="text-gray-800">应发合计</span>
              <span className="text-brand-600 font-mono">¥{slip.gross?.toLocaleString()}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="font-semibold text-gray-800">扣除项目</h3>
            </div>
            {[
              ['养老保险 (个人 8%)', slip.pension],
              ['医疗保险 (个人 2%)', slip.medical],
              ['失业保险 (个人 0.3%)', slip.unemployment],
              ['住房公积金 (个人 5%)', slip.housingFund],
              ['病假扣款', slip.sickDeduct],
              ['事假扣款', slip.personalDeduct],
              ['迟到扣款', slip.lateDeduct],
              ['旷工扣款', slip.absentDeduct],
              ['个人所得税', slip.tax],
            ].map(([label, val], i) => (
              <div key={i} className={lineClass}>
                <span className={labelClass}>{label}</span>
                <span className={valueClass}>
                  {val > 0 ? `¥${val?.toLocaleString()}` : '—'}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 mt-2 border-t-2 border-rose-100 font-bold text-lg">
              <span className="text-gray-800">扣除合计</span>
              <span className="text-rose-600 font-mono">¥{slip.totalDeduct?.toLocaleString()}</span>
            </div>
          </div>

          {/* Net pay */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-50 via-brand-50/50 to-amber-50" />
            <div className="relative p-6 border border-brand-200 rounded-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">实发工资</span>
                  <p className="text-xs text-gray-400 mt-0.5">已扣除社保公积金及个税</p>
                </div>
                <span className="text-3xl font-bold text-brand-600 font-mono tracking-tight">
                  ¥{slip.net?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Rule trace */}
          {slip.trace && slip.trace.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm">📐</span>
                <h3 className="font-semibold text-gray-800">计算依据（审计轨迹）</h3>
                <span className="text-xs text-gray-400 ml-auto">{slip.trace.length} 步</span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                {slip.trace.map((t: any, i: number) => (
                  <div key={i} className="flex gap-2.5 text-gray-500 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-brand-600 font-medium shrink-0">{t.ruleId}</span>
                    <span className="text-gray-400 shrink-0">v{t.version}</span>
                    <span className="flex-1">{t.detail}</span>
                    <span className="text-gray-400 shrink-0">{t.basis}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-gray-300">
              本工资单由智慧人资系统自动生成 · 计算依据可追溯至规则引擎
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 space-y-3">
          <span className="text-5xl block">📭</span>
          <p className="text-gray-400">暂无 {selectedMonth.replace('-', '年')}月工资数据</p>
          <p className="text-gray-300 text-sm">请先在「薪酬核算」页面运行自动核算</p>
        </div>
      )}
    </div>
  )
}

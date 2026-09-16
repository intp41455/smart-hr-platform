import React, { useState, useEffect } from 'react'

export default function Employees({ selectedMonth, API, onSelect }: any) {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`${API}/employees`)
      .then(r => r.json())
      .then(data => setEmployees(data.employees || data || []))
      .catch(() => {})
  }, [])

  const filtered = employees.filter(e => {
    if (search && !e.name.includes(search) && !e.entity?.includes(search) && !e.dept?.includes(search)) return false
    if (filter !== 'all' && e.entity !== filter) return false
    return true
  })

  const entities = [...new Set(employees.map(e => e.entity).filter(Boolean))]

  const entityColors: Record<string, string> = {
    '康源福祉教育': 'bg-brand-50 text-brand-600 border-brand-200',
    '上海康源博曜': 'bg-blue-50 text-blue-600 border-blue-200',
    '康源美宏养老': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    '康源中成养老': 'bg-violet-50 text-violet-600 border-violet-200',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">员工管理</h2>
          <p className="text-sm text-gray-400 mt-0.5">共 {employees.length} 名在职员工</p>
        </div>
        <div className="flex gap-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索姓名 / 主体 / 部门..."
              className="bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-700 w-56 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
          >
            <option value="all">全部主体</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Quick stat chips */}
      <div className="flex gap-2 flex-wrap">
        {entities.map(name => {
          const count = employees.filter(e => e.entity === name).length
          return (
            <button
              key={name}
              onClick={() => setFilter(filter === name ? 'all' : name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === name
                  ? (entityColors[name] || 'bg-brand-50 text-brand-600 border-brand-200')
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {name} <span className="opacity-50 ml-1">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-xs border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">姓名</th>
                <th className="text-left font-semibold">核算主体</th>
                <th className="text-left font-semibold">部门</th>
                <th className="text-left font-semibold">岗位</th>
                <th className="text-left font-semibold hidden md:table-cell">入职日期</th>
                <th className="text-center font-semibold w-20">状态</th>
                <th className="text-center font-semibold w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-bold">
                        {e.name?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{e.name}</span>
                    </div>
                  </td>
                  <td className="text-gray-500">{e.entity}</td>
                  <td className="text-gray-500">{e.dept}</td>
                  <td className="text-gray-500">{e.position}</td>
                  <td className="text-gray-500 hidden md:table-cell">{e.joinDate}</td>
                  <td className="text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      e.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      e.status === 'probation' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                      {e.status === 'active' ? '正式' : e.status === 'probation' ? '试用' : e.status || '—'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => onSelect(e)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-brand-600 hover:bg-brand-50 text-xs font-medium transition-all"
                    >
                      工资单 →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-16 text-center">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="text-gray-400 text-sm">无匹配员工</p>
              <p className="text-gray-300 text-xs mt-1">请调整搜索条件或筛选</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

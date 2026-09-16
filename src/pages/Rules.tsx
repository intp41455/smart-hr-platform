import React, { useState, useEffect } from 'react'

const CATEGORIES = [
  { key: 'all',        label: '全部规则', icon: '📋' },
  { key: 'attendance', label: '考勤规则', icon: '🕐' },
  { key: 'salary',     label: '薪酬规则', icon: '💰' },
  { key: 'validation', label: '校验规则', icon: '🔍' },
  { key: 'deduction',  label: '扣款规则', icon: '➖' },
  { key: 'overtime',   label: '加班规则', icon: '⏰' },
  { key: 'leave',      label: '请假规则', icon: '🏖' },
]

const CATEGORY_OPTIONS = [
  { value: 'attendance', label: '考勤规则' },
  { value: 'salary',     label: '薪酬规则' },
  { value: 'validation', label: '校验规则' },
  { value: 'deduction',  label: '扣款规则' },
  { value: 'overtime',   label: '加班规则' },
  { value: 'leave',      label: '请假规则' },
]

const EMPTY_RULE: any = {
  rule_id: '', name: '', category: 'salary', sub_category: '',
  condition: '', formula: '', priority: 100, version: '2024.06',
  active: 1, description: '', legal_basis: ''
}

const FIELD_META: Record<string, { label: string; placeholder: string; rows?: number }> = {
  rule_id:     { label: '规则 ID *',           placeholder: '如 R-SAL-025' },
  name:        { label: '名称 *',              placeholder: '如 居家办公工资折算' },
  category:    { label: '分类 *',              placeholder: '' },
  sub_category:{ label: '子分类',              placeholder: '如 structure / deduction / bonus' },
  condition:   { label: '触发条件',            placeholder: '如 attendance.remote_work_days > 0', rows: 2 },
  formula:     { label: '公式',                placeholder: '如 remote_deduction = daily_wage * remote_work_days * 0.3', rows: 3 },
  priority:    { label: '优先级',              placeholder: '数字越小越优先，默认 100' },
  version:     { label: '版本',                placeholder: '如 2024.06' },
  active:      { label: '启用',                placeholder: '' },
  description: { label: '说明',                placeholder: '规则用途与适用场景', rows: 2 },
  legal_basis: { label: '法规依据',            placeholder: '如 劳社部发〔2008〕3号', rows: 2 },
}

function catColor(cat: string) {
  const m: Record<string,string> = {
    attendance:'border-brand-200 text-brand-600 bg-brand-50',
    salary:'border-emerald-200 text-emerald-600 bg-emerald-50',
    validation:'border-cyan-200 text-cyan-600 bg-cyan-50',
    deduction:'border-rose-200 text-rose-500 bg-rose-50',
    overtime:'border-amber-200 text-amber-600 bg-amber-50',
    leave:'border-violet-200 text-violet-600 bg-violet-50',
  }
  return m[cat] || 'border-gray-200 text-gray-400 bg-gray-100'
}

export default function Rules({ API }: any) {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [editing, setEditing] = useState<any | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_RULE })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Delete confirm
  const [deleting, setDeleting] = useState<any | null>(null)

  useEffect(() => { fetchRules() }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/rules`); const d = await r.json()
      setRules(d.rules || [])
    } catch { setMessage({ type:'error', text:'获取规则失败' }) }
    finally { setLoading(false) }
  }

  const showMsg = (type: string, text: string) => {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 3000)
  }

  // Open new rule modal
  const openNew = () => {
    setIsNew(true); setForm({ ...EMPTY_RULE }); setEditing(null)
  }

  // Open edit modal
  const openEdit = (rule: any) => {
    setIsNew(false); setEditing(rule)
    setForm({
      rule_id: rule.rule_id, name: rule.name, category: rule.category,
      sub_category: rule.sub_category || '', condition: rule.condition || '',
      formula: rule.formula || '', priority: rule.priority, version: rule.version || '2024.06',
      active: rule.active, description: rule.description || '', legal_basis: rule.legal_basis || ''
    })
  }

  const closeModal = () => { setEditing(null); setForm({ ...EMPTY_RULE }); setIsNew(false) }

  const updateField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  // Save
  const handleSave = async () => {
    if (!form.rule_id.trim() || !form.name.trim()) {
      showMsg('error', '规则 ID 和名称为必填'); return
    }
    setSaving(true)
    try {
      let res
      if (isNew) {
        res = await fetch(`${API}/rules`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      } else {
        res = await fetch(`${API}/rules/${editing.rule_id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      }
      const d = await res.json()
      if (!res.ok) { showMsg('error', d.error || '保存失败'); return }
      showMsg('success', isNew ? '规则已创建' : '规则已更新')
      closeModal()
      fetchRules()
    } catch { showMsg('error', '网络错误') }
    finally { setSaving(false) }
  }

  // Delete
  const handleDelete = async (ruleId: string) => {
    try {
      const res = await fetch(`${API}/rules/${ruleId}`, { method:'DELETE' })
      if (!res.ok) { showMsg('error', '删除失败'); return }
      showMsg('success', `规则 ${ruleId} 已停用（软删除）`)
      setDeleting(null)
      fetchRules()
    } catch { showMsg('error', '网络错误') }
  }

  // Toggle
  const toggleActive = async (rule: any) => {
    try {
      const res = await fetch(`${API}/rules/${rule.rule_id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ active: rule.active ? 0 : 1 })
      })
      if (!res.ok) { showMsg('error', '操作失败'); return }
      showMsg('success', rule.active ? '已停用' : '已启用')
      fetchRules()
    } catch { showMsg('error', '网络错误') }
  }

  // Filter
  let filtered = category === 'all' ? rules : rules.filter(r => r.category === category)
  if (searchTerm) {
    const s = searchTerm.toLowerCase()
    filtered = filtered.filter(r =>
      (r.rule_id || '').toLowerCase().includes(s) ||
      (r.name || '').toLowerCase().includes(s) ||
      (r.formula || r.condition || '').toLowerCase().includes(s)
    )
  }

  // --- Modal component ---
  const renderModal = () => {
    if (!editing && !isNew) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeModal}>
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
             onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-gray-900">
              {isNew ? '➕ 新增规则' : '✏️ 编辑规则'}
            </h3>
            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {isNew && (
              <FormField field="rule_id" value={form.rule_id} onChange={(v:any) => updateField('rule_id', v)} />
            )}
            <FormField field="name" value={form.name} onChange={(v:any) => updateField('name', v)} />

            {/* Category dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">{FIELD_META.category.label}</label>
              <select value={form.category}
                onChange={e => updateField('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all bg-white">
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField field="sub_category" value={form.sub_category} onChange={(v:any) => updateField('sub_category', v)} />
              <FormField field="version" value={form.version} onChange={(v:any) => updateField('version', v)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField field="priority" value={form.priority} onChange={(v:any) => updateField('priority', Number(v)||100)} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{FIELD_META.active.label}</label>
                <label className="inline-flex items-center gap-2 cursor-pointer mt-1.5">
                  <input type="checkbox" checked={!!form.active}
                    onChange={e => updateField('active', e.target.checked ? 1 : 0)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400" />
                  <span className="text-sm text-gray-600">{form.active ? '已启用' : '已停用'}</span>
                </label>
              </div>
            </div>

            <FormField field="condition" value={form.condition} onChange={(v:any) => updateField('condition', v)} />
            <FormField field="formula" value={form.formula} onChange={(v:any) => updateField('formula', v)} />
            <FormField field="description" value={form.description} onChange={(v:any) => updateField('description', v)} />
            <FormField field="legal_basis" value={form.legal_basis} onChange={(v:any) => updateField('legal_basis', v)} />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-all">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Delete confirm ---
  const renderDeleteConfirm = () => {
    if (!deleting) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleting(null)}>
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
          <div className="text-center mb-4">
            <span className="text-4xl">⚠️</span>
            <h4 className="text-base font-bold text-gray-900 mt-2">确认删除</h4>
            <p className="text-sm text-gray-500 mt-1">
              规则 <span className="font-mono text-brand-600">{deleting.rule_id}</span> {deleting.name} 将被停用（软删除），不会物理移除。确认继续？
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={() => handleDelete(deleting.rule_id)} className="flex-1 px-4 py-2 text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-lg font-semibold transition-colors">确认停用</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-in ${
          message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {renderModal()}
      {renderDeleteConfirm()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">规则引擎</h2>
          <p className="text-sm text-gray-400 mt-0.5">{rules.length} 条规则 · 可增删改 · 以数据库为准</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索 ID / 名称 / 公式..."
              className="bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-700 w-52 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-all">
            <span>＋</span> 新增规则
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => {
          const active = category === c.key
          return (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                active
                  ? 'bg-brand-50 text-brand-600 border border-brand-200 shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}>
              <span>{c.icon}</span> {c.label}
            </button>
          )
        })}
      </div>

      {/* Rules table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[65vh]">
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">加载中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">规则 ID</th>
                  <th className="text-left font-semibold">名称</th>
                  <th className="text-left font-semibold w-20">分类</th>
                  <th className="text-left font-semibold">公式</th>
                  <th className="text-left font-semibold w-20">优先级</th>
                  <th className="text-center font-semibold w-16">状态</th>
                  <th className="text-center font-semibold w-28">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="py-3 px-4 font-mono text-xs text-brand-600 font-medium">{r.rule_id}</td>
                    <td className="text-gray-700 font-medium">{r.name}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor(r.category)}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-gray-500 max-w-xs truncate">{r.formula || r.condition || '—'}</td>
                    <td className="text-gray-500 font-mono text-xs">{r.priority}</td>
                    <td className="text-center">
                      <button onClick={() => toggleActive(r)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          r.active
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                        }`}>
                        {r.active ? '已启用' : '已停用'}
                      </button>
                    </td>
                    <td className="text-center">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(r)}
                          className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md transition-colors font-medium">编辑</button>
                        <button onClick={() => setDeleting(r)}
                          className="px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-md transition-colors font-medium">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-16 text-center">
              <span className="text-4xl block mb-3">📭</span>
              <p className="text-gray-400 text-sm">无匹配规则</p>
              <p className="text-gray-300 text-xs mt-1">调整搜索条件或点击"新增规则"</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>显示 {filtered.length} / {rules.length} 条 · 数据库为唯一数据源</span>
        <span>规则版本 v2024.06 · 基于康源集团考勤与薪酬管理制度</span>
      </div>
    </div>
  )
}

// Inline form field
function FormField({ field, value, onChange }: { field: string; value: any; onChange: (v: any) => void }) {
  const meta = FIELD_META[field]
  if (!meta) return null
  const id = `rule-f-${field}`

  if (meta.rows && meta.rows > 1) {
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-semibold text-gray-500 mb-1.5">{meta.label}</label>
        <textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={meta.rows}
          placeholder={meta.placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-y min-h-[60px] font-mono" />
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 mb-1.5">{meta.label}</label>
      <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={meta.placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all font-mono" />
    </div>
  )
}

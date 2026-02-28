'use client'

import { useEffect, useState, useCallback } from 'react'

interface Category { id: number; name: string; photo_attachment: string | null; is_active: boolean }
interface Product {
  id: number; name: string; price: number; cost_price: number
  unit: string | null; category_name: string | null; category_id: number | null
  simple_ingredients: unknown[]; is_active: boolean
}
interface Set { id: number; name: string; price: number; cost_price: number; items: unknown[]; is_active: boolean }

type Tab = 'categories' | 'products' | 'sets'

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [sets, setSets]             = useState<Set[]>([])
  const [tab, setTab]               = useState<Tab>('products')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog')
      const json = await res.json()
      setCategories(json.categories.filter((c: Category) => c.is_active))
      setProducts(json.products.filter((p: Product) => p.is_active))
      setSets(json.sets.filter((s: Set) => s.is_active))
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    setSaving(true)
    try {
      const payload =
        tab === 'categories'
          ? { type: 'category', name: form.name, photo_attachment: form.photo_attachment || undefined }
          : tab === 'products'
          ? { type: 'product', name: form.name, price: Number(form.price), cost_price: Number(form.cost_price ?? 0), unit: form.unit || undefined, category_id: form.category_id ? Number(form.category_id) : undefined, simple_ingredients: [] }
          : { type: 'set', name: form.name, price: Number(form.price), cost_price: Number(form.cost_price ?? 0), items: [] }
      await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setForm({})
      setShowForm(false)
      fetchData()
    } finally { setSaving(false) }
  }

  async function handleDelete(type: string, id: number) {
    if (!confirm('Деактивировать запись?')) return
    await fetch('/api/catalog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }) })
    fetchData()
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'products', label: 'Товары', count: products.length },
    { key: 'categories', label: 'Категории', count: categories.length },
    { key: 'sets', label: 'Сеты', count: sets.length },
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Каталог</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">Товары, категории и сеты доставки</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity"
          style={{ background: 'linear-gradient(90deg, var(--color-gold), var(--color-lime))' }}
        >
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </header>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Добавить {tab === 'categories' ? 'категорию' : tab === 'products' ? 'товар' : 'сет'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Название" value={form.name ?? ''} onChange={v => setForm(f => ({ ...f, name: v }))} />
            {tab === 'products' && (
              <>
                <Field label="Цена (₽)" type="number" value={form.price ?? ''} onChange={v => setForm(f => ({ ...f, price: v }))} />
                <Field label="Себестоимость (₽)" type="number" value={form.cost_price ?? ''} onChange={v => setForm(f => ({ ...f, cost_price: v }))} />
                <Field label="Единица (напр: 80ос)" value={form.unit ?? ''} onChange={v => setForm(f => ({ ...f, unit: v }))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Категория</label>
                  <select
                    value={form.category_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
                  >
                    <option value="">— Без категории —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </>
            )}
            {tab === 'sets' && (
              <>
                <Field label="Цена (₽)" type="number" value={form.price ?? ''} onChange={v => setForm(f => ({ ...f, price: v }))} />
                <Field label="Себестоимость (₽)" type="number" value={form.cost_price ?? ''} onChange={v => setForm(f => ({ ...f, cost_price: v }))} />
              </>
            )}
          </div>
          <button
            disabled={saving || !form.name}
            onClick={handleSave}
            className="self-start rounded-lg px-4 py-2 text-sm font-semibold bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-muted)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-1 w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Загрузка...</p>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Название</th>
                {tab !== 'categories' && (
                  <>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Цена</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Себест.</th>
                  </>
                )}
                {tab === 'products' && (
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Категория</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {tab === 'categories' && categories.map(c => (
                <tr key={c.id} className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-foreground)]">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete('category', c.id)} className="text-xs text-[var(--color-danger)] hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
              {tab === 'products' && products.map(p => (
                <tr key={p.id} className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-foreground)]">
                    {p.name}{p.unit ? ` | ${p.unit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--color-gold)] font-semibold">{Number(p.price).toLocaleString('ru-RU')}₽</td>
                  <td className="px-4 py-3 text-right text-[var(--color-muted)]">{Number(p.cost_price).toLocaleString('ru-RU')}₽</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{p.category_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete('product', p.id)} className="text-xs text-[var(--color-danger)] hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
              {tab === 'sets' && sets.map(s => (
                <tr key={s.id} className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-foreground)]">{s.name}</td>
                  <td className="px-4 py-3 text-right text-[var(--color-gold)] font-semibold">{Number(s.price).toLocaleString('ru-RU')}₽</td>
                  <td className="px-4 py-3 text-right text-[var(--color-muted)]">{Number(s.cost_price).toLocaleString('ru-RU')}₽</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete('set', s.id)} className="text-xs text-[var(--color-danger)] hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {((tab === 'categories' && !categories.length) || (tab === 'products' && !products.length) || (tab === 'sets' && !sets.length)) && (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">Нет записей</p>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-gold)] transition-colors"
      />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'

interface TaxiLocation { id: number; name: string; city: string; category: string; lat: number | null; lng: number | null }
interface TaxiCategory { id: number; name: string }

export default function TaxiMapPage() {
  const [locations, setLocations]   = useState<TaxiLocation[]>([])
  const [categories, setCategories] = useState<TaxiCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState<'location' | 'category' | null>(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState<Record<string, string>>({})
  const [filterCity, setFilterCity] = useState('')
  const [filterCat, setFilterCat]   = useState('')

  // Map image provided by user
  const MAP_URL = 'https://cdn.imgchest.com/files/c7419c8a011b.jpg'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/taxi-locations')
      const json = await res.json()
      setLocations(json.locations ?? [])
      setCategories(json.categories ?? [])
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!showForm) return
    setSaving(true)
    try {
      await fetch('/api/taxi-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: showForm, ...form }),
      })
      setForm({})
      setShowForm(null)
      fetchData()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить точку?')) return
    await fetch('/api/taxi-locations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchData()
  }

  const cities = [...new Set(locations.map(l => l.city))].sort()
  const filtered = locations.filter(l =>
    (!filterCity || l.city === filterCity) &&
    (!filterCat || l.category === filterCat)
  )

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Карта такси</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{locations.length} точек · {categories.length} категорий</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(showForm === 'category' ? null : 'category')}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-foreground)] hover:border-[var(--color-muted)] transition-colors"
          >
            + Категория
          </button>
          <button
            onClick={() => setShowForm(showForm === 'location' ? null : 'location')}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity"
            style={{ background: 'linear-gradient(90deg, var(--color-gold), var(--color-lime))' }}
          >
            + Точка
          </button>
        </div>
      </header>

      {/* Map image */}
      <div className="mb-6 rounded-xl overflow-hidden border border-[var(--color-border)] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAP_URL} alt="Карта такси" className="w-full h-64 object-cover object-center" crossOrigin="anonymous" />
        {/* Overlay pins for locations with coordinates */}
        <div className="absolute inset-0 pointer-events-none">
          {locations
            .filter(l => l.lat != null && l.lng != null)
            .map(l => (
              <div
                key={l.id}
                className="absolute"
                style={{
                  left: `${((Number(l.lng) + 180) / 360) * 100}%`,
                  top: `${((90 - Number(l.lat)) / 180) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-lime))' }}
                  title={l.name}
                />
              </div>
            ))}
        </div>
        <div className="absolute bottom-2 left-3 text-xs text-white/60 font-mono">Карта</div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {showForm === 'category' ? 'Новая категория' : 'Новая точка на карте'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {showForm === 'category' ? (
              <Field label="Название" value={form.name ?? ''} onChange={v => setForm(f => ({ ...f, name: v }))} />
            ) : (
              <>
                <Field label="Название" value={form.name ?? ''} onChange={v => setForm(f => ({ ...f, name: v }))} />
                <Field label="Город" value={form.city ?? ''} onChange={v => setForm(f => ({ ...f, city: v }))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Категория</label>
                  <select
                    value={form.category ?? ''}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
                  >
                    <option value="">— Выберите —</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <Field label="Широта (lat)" type="number" value={form.lat ?? ''} onChange={v => setForm(f => ({ ...f, lat: v }))} />
                <Field label="Долгота (lng)" type="number" value={form.lng ?? ''} onChange={v => setForm(f => ({ ...f, lng: v }))} />
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

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none"
        >
          <option value="">Все города</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-foreground)] outline-none"
        >
          <option value="">Все категории</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Locations list */}
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Загрузка...</p>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Название', 'Город', 'Категория', 'Коорд.', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {filtered.map(loc => (
                <tr key={loc.id} className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-foreground)] font-medium">{loc.name}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{loc.city}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{loc.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">
                    {loc.lat != null ? `${loc.lat}, ${loc.lng}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(loc.id)} className="text-xs text-[var(--color-danger)] hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">Нет точек</td></tr>
              )}
            </tbody>
          </table>
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

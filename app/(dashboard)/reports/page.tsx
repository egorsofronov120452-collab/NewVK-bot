'use client'

import { useEffect, useState, useCallback } from 'react'

interface DailyReport {
  id: number; report_date: string; orders_count: number; total_revenue: number
  courier_payouts: { nick: string; bank: string; amount: number }[]
  is_processed: boolean; created_at: number
}
interface WeeklyReport {
  id: number; week_start: string; week_end: string
  orders_count: number; total_revenue: number; total_cost: number; net_income: number
  salary_payouts: { nick: string; bank: string; salary: number }[]
  is_processed: boolean; created_at: number
}

type Tab = 'daily' | 'weekly'

function formatCurrency(n: number) {
  return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₽'
}

export default function ReportsPage() {
  const [daily, setDaily]     = useState<DailyReport[]>([])
  const [weekly, setWeekly]   = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Tab>('daily')
  const [marking, setMarking] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reports')
      if (res.status === 403) return
      const json = await res.json()
      setDaily(json.daily ?? [])
      setWeekly(json.weekly ?? [])
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function markProcessed(type: Tab, id: number) {
    setMarking(id)
    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      fetchData()
    } finally { setMarking(null) }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Отчёты</h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">Ежедневные и еженедельные отчёты</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-1 w-fit mb-6">
        {([['daily', 'Ежедневные'], ['weekly', 'Еженедельные']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Загрузка...</p>
      ) : tab === 'daily' ? (
        <div className="flex flex-col gap-4">
          {!daily.length && <p className="text-sm text-[var(--color-muted)]">Нет ежедневных отчётов</p>}
          {daily.map(r => (
            <div key={r.id} className={`rounded-xl border bg-[var(--color-surface)] p-5 flex flex-col gap-3 ${r.is_processed ? 'border-[var(--color-border)] opacity-60' : 'border-[var(--color-gold)]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[var(--color-foreground)]">{r.report_date}</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">Заказов: {r.orders_count}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[var(--color-gold)]">{formatCurrency(r.total_revenue)}</span>
                  {!r.is_processed && (
                    <button
                      disabled={marking === r.id}
                      onClick={() => markProcessed('daily', r.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black"
                      style={{ background: 'linear-gradient(90deg, var(--color-gold), var(--color-lime))' }}
                    >
                      {marking === r.id ? '...' : 'Обработано'}
                    </button>
                  )}
                  {r.is_processed && (
                    <span className="text-xs text-[var(--color-success)] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full px-2 py-0.5">Обработан</span>
                  )}
                </div>
              </div>
              {r.courier_payouts?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-2">Выплаты курьерам</p>
                  <div className="flex flex-col gap-1">
                    {r.courier_payouts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-foreground)] font-medium">{p.nick}</span>
                          <span className="text-xs font-mono text-[var(--color-muted)]">{p.bank}</span>
                        </div>
                        <span className="font-semibold text-[var(--color-lime)]">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!weekly.length && <p className="text-sm text-[var(--color-muted)]">Нет еженедельных отчётов</p>}
          {weekly.map(r => (
            <div key={r.id} className={`rounded-xl border bg-[var(--color-surface)] p-5 flex flex-col gap-3 ${r.is_processed ? 'border-[var(--color-border)] opacity-60' : 'border-[var(--color-gold)]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[var(--color-foreground)]">{r.week_start} — {r.week_end}</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">Заказов: {r.orders_count}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!r.is_processed && (
                    <button
                      disabled={marking === r.id}
                      onClick={() => markProcessed('weekly', r.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black"
                      style={{ background: 'linear-gradient(90deg, var(--color-gold), var(--color-lime))' }}
                    >
                      {marking === r.id ? '...' : 'Обработано'}
                    </button>
                  )}
                  {r.is_processed && (
                    <span className="text-xs text-[var(--color-success)] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full px-2 py-0.5">Обработан</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Выручка', value: formatCurrency(r.total_revenue), color: 'text-[var(--color-gold)]' },
                  { label: 'Себестоимость', value: formatCurrency(r.total_cost), color: 'text-[var(--color-danger)]' },
                  { label: 'Доход', value: formatCurrency(r.net_income), color: 'text-[var(--color-lime)]' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {r.salary_payouts?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-2">Зарплаты</p>
                  <div className="flex flex-col gap-1">
                    {r.salary_payouts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-foreground)] font-medium">{p.nick}</span>
                          <span className="text-xs font-mono text-[var(--color-muted)]">{p.bank}</span>
                        </div>
                        <span className="font-semibold text-[var(--color-lime)]">{formatCurrency(p.salary)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

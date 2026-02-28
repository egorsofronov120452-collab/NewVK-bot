'use client'

import { useEffect, useState, useCallback } from 'react'

interface DeliveryOrder {
  id: number
  nickname: string
  delivery_place: string
  status: string
  total_price: number
  courier_nick: string | null
  estimated_time: string | null
  created_at: number
  updated_at: number
}

interface TaxiOrder {
  id: number
  nickname: string
  from_name: string | null
  to_name: string | null
  status: string
  final_price: number | null
  payment_type: string
  driver_nick: string | null
  estimated_time: string | null
  created_at: number
  updated_at: number
}

const DELIVERY_STATUSES: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ожидает',    color: 'text-[var(--color-warning)] bg-[rgba(245,158,11,0.12)]' },
  accepted:   { label: 'Принят',     color: 'text-[var(--color-info)] bg-[rgba(59,130,246,0.12)]' },
  preparing:  { label: 'Готовится',  color: 'text-[var(--color-info)] bg-[rgba(59,130,246,0.12)]' },
  delivering: { label: 'Едет',       color: 'text-[var(--color-lime)] bg-[rgba(132,204,22,0.12)]' },
}

const TAXI_STATUSES: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Ожидает', color: 'text-[var(--color-warning)] bg-[rgba(245,158,11,0.12)]' },
  accepted: { label: 'Принят',  color: 'text-[var(--color-info)] bg-[rgba(59,130,246,0.12)]' },
  enroute:  { label: 'В пути',  color: 'text-[var(--color-lime)] bg-[rgba(132,204,22,0.12)]' },
}

function Badge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] ?? { label: status, color: 'text-[var(--color-muted)]' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.color}`}>{s.label}</span>
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 60000)
  if (d < 1) return 'только что'
  if (d < 60) return `${d} мин. назад`
  return `${Math.floor(d / 60)} ч. назад`
}

export default function DispatchPage() {
  const [delivery, setDelivery] = useState<DeliveryOrder[]>([])
  const [taxi, setTaxi] = useState<TaxiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'delivery' | 'taxi'>('delivery')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dispatch')
      const json = await res.json()
      setDelivery(json.delivery ?? [])
      setTaxi(json.taxi ?? [])
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 10_000)
    return () => clearInterval(t)
  }, [fetchData])

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Диспетчерская</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">Активные заказы · обновление каждые 10 сек</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-foreground)] hover:border-[var(--color-muted)] transition-colors"
        >
          Обновить
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-1 w-fit mb-6">
        {(['delivery', 'taxi'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t === 'delivery' ? `Доставка (${delivery.length})` : `Такси (${taxi.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Загрузка...</p>
      ) : tab === 'delivery' ? (
        delivery.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Нет активных заказов доставки</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {delivery.map(o => (
              <div key={o.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--color-muted)]">#{o.id}</span>
                  <Badge status={o.status} map={DELIVERY_STATUSES} />
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{o.nickname}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{o.delivery_place}</p>
                </div>
                {o.courier_nick && (
                  <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <span>Курьер:</span>
                    <span className="font-medium text-[var(--color-foreground)]">{o.courier_nick}</span>
                    {o.estimated_time && <span>· ~{o.estimated_time}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
                  <span className="text-xs text-[var(--color-muted)]">{timeAgo(o.created_at)}</span>
                  <span className="text-sm font-bold text-[var(--color-gold)]">{o.total_price?.toLocaleString('ru-RU')}₽</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        taxi.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Нет активных заказов такси</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxi.map(o => (
              <div key={o.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--color-muted)]">#{o.id}</span>
                  <Badge status={o.status} map={TAXI_STATUSES} />
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{o.nickname}</p>
                  {o.from_name && o.to_name && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {o.from_name} <span className="text-[var(--color-gold)]">→</span> {o.to_name}
                    </p>
                  )}
                </div>
                {o.driver_nick && (
                  <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <span>Водитель:</span>
                    <span className="font-medium text-[var(--color-foreground)]">{o.driver_nick}</span>
                    {o.estimated_time && <span>· ~{o.estimated_time}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-muted)]">{timeAgo(o.created_at)}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {o.payment_type === 'cash' ? 'Наличные' : 'Банк. счёт'}
                    </span>
                  </div>
                  {o.final_price != null && (
                    <span className="text-sm font-bold text-[var(--color-gold)]">{o.final_price?.toLocaleString('ru-RU')}₽</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'

interface OnlineUser {
  vk_id: number
  status: 'online' | 'afk'
  activity_text: string
  started_at: number
  nickname: string | null
  role: string | null
}

interface ActiveOrder {
  id: number
  nickname: string
  delivery_place?: string
  status: string
  total_price?: number
  final_price?: number
  payment_type?: string
  created_at: number
}

interface BotStatus {
  id: number
  name: string
  endpoint: string
  configured: boolean
}

interface DashboardData {
  onlineList: OnlineUser[]
  employees: number
  categories: number
  activeDelivery: ActiveOrder[]
  activeTaxi: ActiveOrder[]
  todayOrders: number
  todayRevenue: number
  botStatuses: BotStatus[]
  error?: string
}

const DELIVERY_LABELS: Record<string, string> = {
  pending: 'Ожидает', accepted: 'Принят', preparing: 'Готовится',
  delivering: 'Едет', delivered: 'Доставлен', cancelled: 'Отменён',
}
const TAXI_LABELS: Record<string, string> = {
  pending: 'Ожидает', accepted: 'Принят', enroute: 'В пути',
  delivered: 'Завершён', cancelled: 'Отменён',
}

function formatDuration(startedAt: number) {
  const sec = Math.floor((Date.now() - startedAt) / 1000)
  if (sec < 60) return `${sec}с`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}м`
  return `${Math.floor(min / 60)}ч ${min % 60}м`
}

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const map: Record<string, string> = {
    pending:   'text-[var(--color-warning)] bg-[rgba(245,158,11,0.12)]',
    accepted:  'text-[var(--color-info)] bg-[rgba(59,130,246,0.12)]',
    preparing: 'text-[var(--color-info)] bg-[rgba(59,130,246,0.12)]',
    delivering:'text-[var(--color-lime)] bg-[rgba(132,204,22,0.12)]',
    enroute:   'text-[var(--color-lime)] bg-[rgba(132,204,22,0.12)]',
    delivered: 'text-[var(--color-success)] bg-[rgba(34,197,94,0.12)]',
    cancelled: 'text-[var(--color-danger)] bg-[rgba(239,68,68,0.12)]',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'text-[var(--color-muted)]'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold mb-3">
      {children}
    </h2>
  )
}

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch { /* keep existing */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 15_000)
    return () => clearInterval(t)
  }, [fetchData])

  const onlineCount = data?.onlineList.filter(u => u.status === 'online').length ?? 0
  const afkCount    = data?.onlineList.filter(u => u.status === 'afk').length ?? 0

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] inline-block" />
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-success)] font-semibold">Live</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Главная</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">Обновление каждые 15 сек</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-[var(--color-muted)]">
              {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
          <button
            onClick={fetchData}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-foreground)] hover:border-[var(--color-muted)] transition-colors"
          >
            Обновить
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-24 text-[var(--color-muted)] text-sm">Загрузка...</div>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-6">
          {/* Bot statuses */}
          <Card className="p-5">
            <SectionTitle>Статус ботов</SectionTitle>
            <div className="flex flex-col gap-2">
              {data.botStatuses.map(bot => (
                <div key={bot.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${bot.configured ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`} />
                    <span className="text-sm text-[var(--color-foreground)]">{bot.name}</span>
                    <span className={`text-xs ${bot.configured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {bot.configured ? 'Активен' : 'Не настроен'}
                    </span>
                  </div>
                  <code className="text-xs font-mono text-[var(--color-muted)]">{bot.endpoint}</code>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Онлайн', value: onlineCount, sub: afkCount > 0 ? `+${afkCount} AFK` : undefined },
              { label: 'Сотрудников', value: data.employees, sub: 'в базе' },
              { label: 'Заказов сегодня', value: data.todayOrders },
              { label: 'Выручка', value: data.todayRevenue > 0 ? `${data.todayRevenue.toLocaleString('ru-RU')}₽` : '—' },
            ].map(s => (
              <Card key={s.label} className="p-4 flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">{s.label}</p>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{s.value}</p>
                {s.sub && <p className="text-xs text-[var(--color-muted-foreground)]">{s.sub}</p>}
              </Card>
            ))}
          </div>

          {/* Online list */}
          <Card className="p-5">
            <SectionTitle>Онлайн — {data.onlineList.length} чел.</SectionTitle>
            {data.onlineList.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Никого нет онлайн</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.onlineList.map(u => (
                  <div key={u.vk_id} className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] px-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${u.status === 'online' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{u.nickname ?? `id${u.vk_id}`}</p>
                      <p className="text-xs text-[var(--color-muted)]">{u.role ? `${u.role} · ` : ''}{u.activity_text}</p>
                    </div>
                    <span className="text-xs font-mono text-[var(--color-muted)] shrink-0">{formatDuration(u.started_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active orders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Доставка', orders: data.activeDelivery, labels: DELIVERY_LABELS, priceKey: 'total_price' as const },
              { title: 'Такси',    orders: data.activeTaxi,    labels: TAXI_LABELS,    priceKey: 'final_price' as const },
            ].map(({ title, orders, labels, priceKey }) => (
              <Card key={title} className="p-5">
                <SectionTitle>{title} — {orders.length} заказов</SectionTitle>
                {orders.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">Нет активных заказов</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {orders.map(o => (
                      <div key={o.id} className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-[var(--color-muted)]">#{o.id}</span>
                          <StatusBadge status={o.status} labels={labels} />
                        </div>
                        <p className="text-sm font-medium text-[var(--color-foreground)]">{o.nickname}</p>
                        {o.delivery_place && <p className="text-xs text-[var(--color-muted)] truncate">{o.delivery_place}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {new Date(o.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {o[priceKey] != null && (
                            <span className="text-xs font-semibold text-[var(--color-accent)]">{o[priceKey]}₽</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Endpoints */}
          <Card className="p-5">
            <SectionTitle>Callback endpoints</SectionTitle>
            <div className="flex flex-col gap-2">
              {data.botStatuses.map(bot => (
                <div key={bot.id} className="flex flex-col gap-0.5">
                  <span className="text-xs text-[var(--color-muted)]">{bot.name}</span>
                  <code className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] px-3 py-2 text-xs font-mono text-[var(--color-info)] select-all break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://YOUR-DOMAIN'}{bot.endpoint}
                  </code>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

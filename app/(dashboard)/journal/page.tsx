'use client'

import { useEffect, useState, useCallback } from 'react'

interface OnlineEntry {
  vk_id: number
  nick: string
  role: string
  status: string
  status_text: string
  last_seen: number
  online_since: number | null
}

interface JournalEvent {
  id: number
  vk_id: number
  nick: string
  role: string
  status: string
  status_text: string
  event: string
  created_at: number
}

interface JournalData {
  currentOnline: OnlineEntry[]
  events: JournalEvent[]
  date: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'РС', senior: 'СС', courier: 'Курьер', trainee: 'Стажёр', leadership: 'Рук.',
}

function formatMs(ms: number) {
  if (!ms || ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}ч ${m}м` : `${m}м`
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-[var(--color-success)]',
    afk:    'bg-[var(--color-warning)]',
    offline:'bg-[var(--color-muted)]',
  }
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[status] ?? 'bg-[var(--color-muted)]'}`} />
}

export default function JournalPage() {
  const [data, setData] = useState<JournalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingStatus, setSettingStatus] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [tab, setTab] = useState<'online' | 'events'>('online')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/journal')
      const json = await res.json()
      setData(json)
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 15_000)
    return () => clearInterval(t)
  }, [fetchData])

  async function setStatus(event: 'online' | 'afk' | 'offline') {
    setSettingStatus(true)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, statusText: statusText || undefined }),
      })
      setStatusText('')
      fetchData()
    } finally { setSettingStatus(false) }
  }

  const onlineCount = data?.currentOnline.filter(u => u.status === 'online').length ?? 0
  const afkCount    = data?.currentOnline.filter(u => u.status === 'afk').length ?? 0

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Журнал активности</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Онлайн: {onlineCount} · AFK: {afkCount}
          </p>
        </div>
        {/* Status control */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={statusText}
            onChange={e => setStatusText(e.target.value)}
            placeholder="Статус (опционально)"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-gold)] transition-colors w-48"
          />
          <button
            disabled={settingStatus}
            onClick={() => setStatus('online')}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[rgba(34,197,94,0.15)] text-[var(--color-success)] border border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.25)] transition-colors disabled:opacity-50"
          >
            !онлайн
          </button>
          <button
            disabled={settingStatus}
            onClick={() => setStatus('afk')}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[rgba(245,158,11,0.15)] text-[var(--color-warning)] border border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.25)] transition-colors disabled:opacity-50"
          >
            !афк
          </button>
          <button
            disabled={settingStatus}
            onClick={() => setStatus('offline')}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[rgba(107,107,120,0.15)] text-[var(--color-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors disabled:opacity-50"
          >
            !вышел
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-1 w-fit mb-6">
        {([['online', 'Сейчас онлайн'], ['events', 'События']] as const).map(([key, label]) => (
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
      ) : tab === 'online' ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Header row like the VK message format */}
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">На сервере:</span>
          </div>
          {!data?.currentOnline.length ? (
            <p className="px-4 py-4 text-sm text-[var(--color-muted)]">Никого нет онлайн</p>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {data.currentOnline.map(u => (
                <div key={u.vk_id} className="flex items-center gap-3 px-4 py-3">
                  <StatusDot status={u.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--color-foreground)]">{u.nick}</span>
                    <span className="text-xs text-[var(--color-muted)] ml-2">({ROLE_LABELS[u.role] ?? u.role})</span>
                  </div>
                  <span className="text-xs text-[var(--color-muted-foreground)] shrink-0">
                    {u.status === 'afk' ? 'AFK' : u.status_text || 'доставка'}
                  </span>
                  {u.online_since && (
                    <span className="text-xs font-mono text-[var(--color-muted)] shrink-0">
                      {formatMs(Date.now() - u.online_since)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              События — {data?.date}
            </span>
          </div>
          {!data?.events.length ? (
            <p className="px-4 py-4 text-sm text-[var(--color-muted)]">Нет событий за этот день</p>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)] max-h-[60vh] overflow-y-auto">
              {data.events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-2.5">
                  <StatusDot status={ev.event} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--color-foreground)] font-medium">{ev.nick}</span>
                    <span className="text-xs text-[var(--color-muted)] ml-1">({ROLE_LABELS[ev.role] ?? ev.role})</span>
                    <span className="text-xs text-[var(--color-muted-foreground)] ml-2">
                      {ev.event === 'online' ? 'вышел в сеть' : ev.event === 'afk' ? 'ушёл в AFK' : 'вышел'}
                      {ev.status_text ? ` · ${ev.status_text}` : ''}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-muted)] shrink-0">{formatTime(ev.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

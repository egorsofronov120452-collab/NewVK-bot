'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Ошибка входа')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Сеть недоступна')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-background)] font-sans">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,160,23,0.25) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight gradient-text mb-1">Kaskad</h1>
          <p className="text-sm text-[var(--color-muted)]">Панель управления · Вход</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4 shadow-xl"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Никнейм ВК
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Jack_Schmitz"
              autoComplete="username"
              required
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg, var(--color-gold), var(--color-lime))' }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          Аккаунт создаётся через VK-бот. Пароль устанавливается командой в ЛС.
        </p>
      </div>
    </main>
  )
}

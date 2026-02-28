'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: string
  roles?: string[]
  communities?: ('delivery' | 'taxi')[]
}

const NAV: NavItem[] = [
  { href: '/',              label: 'Главная',         icon: '⬡' },
  { href: '/dispatch',      label: 'Диспетчерская',   icon: '⊞', communities: ['delivery', 'taxi'] },
  { href: '/journal',       label: 'Журнал активности', icon: '◎' },
  { href: '/catalog',       label: 'Каталог',         icon: '▤', communities: ['delivery'] },
  { href: '/employees',     label: 'Сотрудники',      icon: '◉', roles: ['admin', 'senior'] },
  { href: '/taxi-map',      label: 'Карта такси',     icon: '◈', communities: ['taxi'] },
  { href: '/reports',       label: 'Отчёты',          icon: '▦', roles: ['admin', 'senior', 'leadership'] },
  { href: '/chat-history',  label: 'История чатов',   icon: '◫', roles: ['admin', 'senior', 'leadership'] },
]

interface User {
  nickname: string
  role: string
  in_delivery: boolean
  in_taxi: boolean
}

interface SidebarProps {
  user: User
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const filteredNav = NAV.filter(item => {
    if (item.roles && !item.roles.includes(user.role) && user.role !== 'admin') return false
    if (item.communities) {
      const hasDelivery = item.communities.includes('delivery') && user.in_delivery
      const hasTaxi = item.communities.includes('taxi') && user.in_taxi
      if (!hasDelivery && !hasTaxi) return false
    }
    return true
  })

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <span className="text-lg font-bold gradient-text tracking-tight">Kaskad</span>
        <p className="text-[10px] text-[var(--color-muted)] mt-0.5 uppercase tracking-widest">Панель управления</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {filteredNav.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[rgba(212,160,23,0.12)] text-[var(--color-gold)] font-medium'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[var(--color-border)]">
        <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] mb-2">
          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{user.nickname}</p>
          <p className="text-xs text-[var(--color-muted)]">{user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50"
        >
          {loggingOut ? 'Выход...' : 'Выйти'}
        </button>
      </div>
    </aside>
  )
}

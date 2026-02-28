'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface ChatPeer { peer_id: number; peer_name: string | null; last_message: number }
interface ChatMessage {
  id: number; peer_id: number; sender_vk_id: number; sender_nick: string | null
  text: string; attachments: unknown[]; created_at: number
}

function timeStr(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function ChatHistoryPage() {
  const [peers, setPeers]         = useState<ChatPeer[]>([])
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [selected, setSelected]   = useState<ChatPeer | null>(null)
  const [loading, setLoading]     = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)

  const fetchPeers = useCallback(async () => {
    try {
      const res = await fetch('/api/chat-history')
      if (res.status === 403) return
      const json = await res.json()
      setPeers(json.peers ?? [])
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  const fetchMessages = useCallback(async (peer: ChatPeer) => {
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/chat-history?peer_id=${peer.peer_id}`)
      const json = await res.json()
      setMessages(json.messages ?? [])
    } catch { /* keep */ }
    finally { setMsgLoading(false) }
  }, [])

  useEffect(() => { fetchPeers() }, [fetchPeers])

  useEffect(() => {
    if (selected) fetchMessages(selected)
  }, [selected, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">История чатов</h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">Доступно для руководства</p>
      </header>

      <div className="flex gap-4 h-[70vh]">
        {/* Peer list */}
        <div className="w-56 shrink-0 flex flex-col gap-1 overflow-y-auto">
          {loading && <p className="text-sm text-[var(--color-muted)] p-2">Загрузка...</p>}
          {!loading && !peers.length && <p className="text-sm text-[var(--color-muted)] p-2">Нет чатов</p>}
          {peers.map(peer => (
            <button
              key={peer.peer_id}
              onClick={() => setSelected(peer)}
              className={`text-left rounded-lg px-3 py-2.5 transition-colors ${
                selected?.peer_id === peer.peer_id
                  ? 'bg-[rgba(212,160,23,0.12)] border border-[var(--color-gold)]'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]'
              }`}
            >
              <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                {peer.peer_name ?? `Чат ${peer.peer_id}`}
              </p>
              <p className="text-xs text-[var(--color-muted)]">{timeStr(peer.last_message)}</p>
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-muted)]">
              Выберите чат
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <span className="font-semibold text-[var(--color-foreground)]">
                  {selected.peer_name ?? `Чат ${selected.peer_id}`}
                </span>
                <span className="text-xs text-[var(--color-muted)] font-mono">peer_id: {selected.peer_id}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {msgLoading && <p className="text-sm text-[var(--color-muted)] text-center">Загрузка...</p>}
                {!msgLoading && !messages.length && (
                  <p className="text-sm text-[var(--color-muted)] text-center">Нет сообщений</p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className="flex flex-col gap-0.5 max-w-2xl">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-[var(--color-gold)]">
                        {msg.sender_nick ?? `id${msg.sender_vk_id}`}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)] font-mono">{timeStr(msg.created_at)}</span>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                      {msg.text || <span className="text-[var(--color-muted)] italic">Вложение</span>}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
const sql = neon(process.env.DATABASE_URL!)

function getSession(token?: string) {
  if (!token) return null
  try {
    const d = JSON.parse(Buffer.from(token, 'base64').toString())
    return d.exp > Date.now() ? d : null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date') // YYYY-MM-DD or null for today

  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const [currentOnline, events, stats] = await Promise.all([
    // Current online status
    sql`
      SELECT vk_id, nick, role, status, status_text, last_seen, online_since
      FROM online_status
      WHERE status IN ('online', 'afk')
      ORDER BY online_since ASC NULLS LAST
    `,
    // Events log for date
    sql`
      SELECT id, vk_id, nick, role, status, status_text, event, created_at
      FROM online_journal
      WHERE created_at::date = ${targetDate}::date
      ORDER BY created_at DESC
      LIMIT 200
    `,
    // Stats per user for date
    sql`
      SELECT
        vk_id,
        nick,
        COUNT(*) FILTER (WHERE event = 'online') AS sessions,
        SUM(
          CASE WHEN event = 'offline' THEN
            EXTRACT(EPOCH FROM (
              TO_TIMESTAMP(created_at / 1000.0) -
              TO_TIMESTAMP(LAG(created_at, 1) OVER (PARTITION BY vk_id ORDER BY created_at) / 1000.0)
            )) * 1000
          ELSE 0 END
        ) AS approx_online_ms
      FROM online_journal
      WHERE created_at::date = ${targetDate}::date
      GROUP BY vk_id, nick
    `,
  ])

  return NextResponse.json({ currentOnline, events, stats, date: targetDate })
}

// POST — set online status from website
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event, statusText } = await req.json()
  const validEvents = ['online', 'afk', 'offline']
  if (!validEvents.includes(event)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const defaultStatus: Record<string, string> = {
    online: 'доставка',
    afk: 'Не у ПК',
    offline: '',
  }
  const text = statusText ?? defaultStatus[event]

  // Update online_status
  if (event === 'offline') {
    await sql`
      UPDATE online_status
      SET status = 'offline', status_text = '', last_seen = ${Date.now()}
      WHERE vk_id = ${session.vk_id}
    `
  } else {
    await sql`
      INSERT INTO online_status (vk_id, nick, role, status, status_text, last_seen, online_since)
      VALUES (${session.vk_id}, ${session.nickname}, ${session.role}, ${event}, ${text}, ${Date.now()}, ${Date.now()})
      ON CONFLICT (vk_id) DO UPDATE SET
        status = EXCLUDED.status,
        status_text = EXCLUDED.status_text,
        last_seen = EXCLUDED.last_seen,
        online_since = CASE WHEN online_status.status = 'offline' THEN EXCLUDED.online_since ELSE online_status.online_since END
    `
  }

  // Log event
  await sql`
    INSERT INTO online_journal (vk_id, nick, role, peer_id, status, status_text, event)
    VALUES (${session.vk_id}, ${session.nickname}, ${session.role}, 0, ${event}, ${text}, ${event})
  `

  return NextResponse.json({ ok: true })
}

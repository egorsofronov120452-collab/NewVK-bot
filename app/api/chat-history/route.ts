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
  if (!['admin', 'senior', 'leadership'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const peerId = url.searchParams.get('peer_id')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200)

  // List distinct chats
  const peers = await sql`
    SELECT DISTINCT peer_id, peer_name, MAX(created_at) AS last_message
    FROM chat_history
    GROUP BY peer_id, peer_name
    ORDER BY last_message DESC
    LIMIT 50
  `

  if (!peerId) {
    return NextResponse.json({ peers })
  }

  const messages = await sql`
    SELECT * FROM chat_history
    WHERE peer_id = ${Number(peerId)}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return NextResponse.json({ peers, messages: messages.reverse() })
}

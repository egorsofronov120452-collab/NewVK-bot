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

export async function GET() {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'senior', 'leadership'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [daily, weekly] = await Promise.all([
    sql`SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 30`,
    sql`SELECT * FROM weekly_reports ORDER BY week_start DESC LIMIT 12`,
  ])

  return NextResponse.json({ daily, weekly })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'leadership'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { type, id } = await req.json()

  if (type === 'daily') {
    await sql`UPDATE daily_reports SET is_processed = true WHERE id = ${id}`
  } else if (type === 'weekly') {
    await sql`UPDATE weekly_reports SET is_processed = true WHERE id = ${id}`
  }

  return NextResponse.json({ ok: true })
}

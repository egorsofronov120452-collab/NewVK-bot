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

  const [locations, categories] = await Promise.all([
    sql`SELECT * FROM taxi_locations WHERE is_active = true ORDER BY city, category, name`,
    sql`SELECT * FROM taxi_location_categories ORDER BY name`,
  ])

  return NextResponse.json({ locations, categories })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'senior', 'leadership'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { type } = body

  if (type === 'category') {
    const rows = await sql`
      INSERT INTO taxi_location_categories (name, added_by)
      VALUES (${body.name}, ${session.vk_id})
      ON CONFLICT (name) DO NOTHING
      RETURNING *
    `
    return NextResponse.json({ ok: true, row: rows[0] })
  }

  if (type === 'location') {
    const { name, city, category, lat, lng } = body
    const rows = await sql`
      INSERT INTO taxi_locations (name, city, category, lat, lng, added_by)
      VALUES (${name}, ${city}, ${category}, ${lat ?? null}, ${lng ?? null}, ${session.vk_id})
      RETURNING *
    `
    return NextResponse.json({ ok: true, row: rows[0] })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const session = getSession(cookieStore.get('kaskad_session')?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'senior', 'leadership'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  await sql`UPDATE taxi_locations SET is_active = false WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}

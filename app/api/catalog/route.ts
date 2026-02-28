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

  const [categories, products, sets] = await Promise.all([
    sql`SELECT * FROM product_categories ORDER BY sort_order, name`,
    sql`SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id ORDER BY pc.name, p.name`,
    sql`SELECT * FROM sets ORDER BY name`,
  ])

  return NextResponse.json({ categories, products, sets })
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
    const { name, photo_attachment } = body
    const rows = await sql`
      INSERT INTO product_categories (name, photo_attachment, added_by)
      VALUES (${name}, ${photo_attachment ?? null}, ${session.vk_id})
      RETURNING *
    `
    return NextResponse.json({ ok: true, row: rows[0] })
  }

  if (type === 'product') {
    const { category_id, name, price, cost_price, unit, simple_ingredients, instruction_photo } = body
    const rows = await sql`
      INSERT INTO products (category_id, name, price, cost_price, unit, simple_ingredients, instruction_photo, added_by)
      VALUES (
        ${category_id ?? null}, ${name}, ${price}, ${cost_price ?? 0},
        ${unit ?? null}, ${JSON.stringify(simple_ingredients ?? [])},
        ${instruction_photo ?? null}, ${session.vk_id}
      )
      RETURNING *
    `
    return NextResponse.json({ ok: true, row: rows[0] })
  }

  if (type === 'set') {
    const { name, price, cost_price, items } = body
    const rows = await sql`
      INSERT INTO sets (name, price, cost_price, items, added_by)
      VALUES (${name}, ${price}, ${cost_price ?? 0}, ${JSON.stringify(items ?? [])}, ${session.vk_id})
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

  const { type, id } = await req.json()

  if (type === 'category') {
    await sql`UPDATE product_categories SET is_active = false WHERE id = ${id}`
  } else if (type === 'product') {
    await sql`UPDATE products SET is_active = false WHERE id = ${id}`
  } else if (type === 'set') {
    await sql`UPDATE sets SET is_active = false WHERE id = ${id}`
  }

  return NextResponse.json({ ok: true })
}

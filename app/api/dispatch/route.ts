import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
const sql = neon(process.env.DATABASE_URL!)

function getSession(token: string | undefined) {
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

  const [deliveryOrders, taxiOrders] = await Promise.all([
    sql`
      SELECT id, client_nick AS nickname, delivery_address AS delivery_place, status,
             total AS total_price, courier_nick, estimated_time, created_at, updated_at
      FROM orders
      WHERE status NOT IN ('delivered', 'cancelled')
      ORDER BY created_at DESC
    `,
    sql`
      SELECT id, client_nick AS nickname, from_name, to_name, status,
             final_price, payment_type, driver_nick, estimated_time, created_at, updated_at
      FROM taxi_orders
      WHERE status NOT IN ('delivered', 'cancelled')
      ORDER BY created_at DESC
    `,
  ])

  return NextResponse.json({ delivery: deliveryOrders, taxi: taxiOrders })
}

import { NextResponse } from 'next/server'
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

  const isSeniorOrAbove = ['admin', 'senior', 'leadership'].includes(session.role)

  if (isSeniorOrAbove) {
    // Return all employees with stats and cars
    const [employees, stats, cars] = await Promise.all([
      sql`
        SELECT u.vk_id, u.nickname, u.role, u.bank_account, u.in_delivery_community, u.in_taxi_community, u.joined_at
        FROM users u
        WHERE u.nickname IS NOT NULL
        ORDER BY u.joined_at DESC
      `,
      sql`SELECT * FROM employee_stats`,
      sql`
        SELECT ec.*, c.name AS car_name, c.photo_attachment AS car_photo, c.is_org_car
        FROM employee_cars ec
        JOIN cars c ON ec.car_id = c.id
        WHERE ec.is_active = true
      `,
    ])
    return NextResponse.json({ employees, stats, cars })
  } else {
    // Return only own profile
    const [employee] = await Promise.all([
      sql`
        SELECT u.vk_id, u.nickname, u.role, u.bank_account, u.in_delivery_community, u.in_taxi_community, u.joined_at
        FROM users u
        WHERE u.vk_id = ${session.vk_id}
      `,
    ])
    const [myStats] = [
      await sql`SELECT * FROM employee_stats WHERE vk_id = ${session.vk_id}`,
    ]
    const [myCars] = [
      await sql`
        SELECT ec.*, c.name AS car_name, c.photo_attachment AS car_photo, c.is_org_car
        FROM employee_cars ec
        JOIN cars c ON ec.car_id = c.id
        WHERE ec.employee_vk_id = ${session.vk_id} AND ec.is_active = true
      `,
    ]
    return NextResponse.json({ employees: employee, stats: myStats, cars: myCars })
  }
}

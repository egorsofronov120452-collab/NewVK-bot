import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'

const sql = neon(process.env.DATABASE_URL!)

// Simple SHA-256 password check (bcrypt not available in Edge; use Node runtime)
export const runtime = 'nodejs'

function hashPassword(pwd: string): string {
  return createHash('sha256').update(pwd + process.env.NEXTAUTH_SECRET!).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { nickname, password } = await req.json()

    if (!nickname || !password) {
      return NextResponse.json({ error: 'Укажите никнейм и пароль' }, { status: 400 })
    }

    const rows = await sql`
      SELECT vk_id, nickname, site_role, site_password, in_delivery_community, in_taxi_community
      FROM users
      WHERE LOWER(nickname) = LOWER(${nickname})
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })
    }

    const user = rows[0]

    if (!user.site_password) {
      return NextResponse.json({ error: 'Пароль для сайта не установлен. Задайте его через бот.' }, { status: 401 })
    }

    const hashed = hashPassword(password)
    if (hashed !== user.site_password) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    // Create session payload
    const sessionData = JSON.stringify({
      vk_id: user.vk_id,
      nickname: user.nickname,
      role: user.site_role,
      in_delivery: user.in_delivery_community,
      in_taxi: user.in_taxi_community,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    const sessionToken = Buffer.from(sessionData).toString('base64')

    const cookieStore = await cookies()
    cookieStore.set('kaskad_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return NextResponse.json({
      ok: true,
      user: {
        vk_id: user.vk_id,
        nickname: user.nickname,
        role: user.site_role,
        in_delivery: user.in_delivery_community,
        in_taxi: user.in_taxi_community,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

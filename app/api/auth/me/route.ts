import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export function getSession(req?: NextRequest) {
  try {
    // Can be called from middleware (with req) or route handler (without)
    const token = req
      ? req.cookies.get('kaskad_session')?.value
      : undefined

    if (!token) return null
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('kaskad_session')?.value
  if (!token) return NextResponse.json({ user: null })

  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    if (data.exp < Date.now()) {
      return NextResponse.json({ user: null })
    }
    return NextResponse.json({ user: data })
  } catch {
    return NextResponse.json({ user: null })
  }
}

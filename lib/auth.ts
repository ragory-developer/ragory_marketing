import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-marketing-key-2024'
)

export async function signToken(payload: object): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

/** Shared helper — reads auth cookie and returns payload or a 401 response */
export async function getAuthPayload(): Promise<
  { payload: any; error: null } | { payload: null; error: NextResponse }
> {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) {
    return { payload: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return { payload: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { payload, error: null }
}

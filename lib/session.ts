import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { SessionPayload, UserRole } from "./types"

const getEncodedKey = () => {
  const secretKey = process.env.AUTH_SECRET
  if (!secretKey || secretKey.length === 0) {
    throw new Error("AUTH_SECRET environment variable is not set")
  }
  return new TextEncoder().encode(secretKey)
}

const SESSION_COOKIE_NAME = "session_token"
const SESSION_DURATION_HOURS = 15 // Match party code duration

export async function createSession(role: UserRole): Promise<string> {
  const encodedKey = getEncodedKey()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)
  
  const session = await new SignJWT({
    authenticated: true,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey)

  return session
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  try {
    const encodedKey = getEncodedKey()
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    })

    return payload as unknown as SessionPayload
  } catch (error) {
    console.error("Session verification failed:", error)
    return null
  }
}

export async function verifySession(): Promise<boolean> {
  const session = await getSession()
  return session?.authenticated === true
}

export async function getSessionRole(): Promise<UserRole | null> {
  const session = await getSession()
  return session?.role ?? null
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * For use in middleware - verifies token without using cookies() directly
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  if (!token) {
    return null
  }

  try {
    const encodedKey = getEncodedKey()
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    })

    return payload as unknown as SessionPayload
  } catch (error) {
    return null
  }
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const getEncodedKey = () => {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET is not set")
  }
  return new TextEncoder().encode(secret)
}

// Routes configuration
const adminOnlyRoutes = ["/", "/dashboard"]
const scannerRoutes = ["/scanner"]
const publicRoutes = ["/login"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("session_token")?.value

  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    // If already authenticated, redirect appropriately
    if (token) {
      try {
        const encodedKey = getEncodedKey()
        const { payload } = await jwtVerify(token, encodedKey)
        const role = payload.role as string

        if (role === "admin") {
          return NextResponse.redirect(new URL("/", request.url))
        } else {
          return NextResponse.redirect(new URL("/scanner", request.url))
        }
      } catch {
        // Invalid token, let them access login
      }
    }
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const encodedKey = getEncodedKey()
    const { payload } = await jwtVerify(token, encodedKey)
    const role = payload.role as string
    const isAuthenticated = payload.authenticated === true

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check admin-only routes
    const isAdminRoute = adminOnlyRoutes.some(route => 
      pathname === route || (route !== "/" && pathname.startsWith(route))
    )
    
    if (isAdminRoute && role !== "admin") {
      // Scanners trying to access admin routes get redirected to scanner
      return NextResponse.redirect(new URL("/scanner", request.url))
    }

    // Check scanner routes - allow both admin and scanner
    const isScannerRoute = scannerRoutes.some(route => pathname.startsWith(route))
    if (isScannerRoute && role !== "admin" && role !== "scanner") {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    // Invalid token - redirect to login
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/gw2')

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/gw2/:path*', '/login'],
}

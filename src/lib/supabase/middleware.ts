import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return response
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // 1. Root domain ('/'): otomatis diarahkan ke '/tiket' untuk maba
  if (pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/tiket'
    return NextResponse.redirect(redirectUrl)
  }

  // 2. Cek token sesi otentikasi login
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('auth-token') || c.name.includes('sb-'))

  // 3. Rute-rute internal Panitia yang WAJIB login
  const isProtectedPanitiaRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/presensi') || 
    pathname.startsWith('/proyektor') ||
    pathname.startsWith('/member/')

  if (hasAuthCookie) {
    try {
      await supabase.auth.getUser()
    } catch {
      // ignore
    }
  }

  // 4. Jika maba / pengunjung belum login mencoba buka rute panitia, seketika tendang ke /masuk
  if (isProtectedPanitiaRoute && !hasAuthCookie) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/masuk'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

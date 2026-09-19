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

  // Cek auth cookie supabase
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('auth-token'))
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (hasAuthCookie) {
    try {
      await supabase.auth.getUser()
    } catch {
      // ignore
    }
  }

  // Jika mencoba masuk /dashboard tanpa session supabase, redirect ke /masuk
  if (isDashboardRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/masuk'
    return NextResponse.redirect(url)
  }

  return response
}

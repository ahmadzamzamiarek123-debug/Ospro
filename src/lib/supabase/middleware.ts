import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Cek auth cookie supabase atau mock_user lokal
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('auth-token'))
  const hasMockUser = request.cookies.has('mock_user')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (hasAuthCookie) {
    try {
      await supabase.auth.getUser()
    } catch {
      // Offline fallback
    }
  }

  // Jika mencoba masuk /dashboard tanpa session supabase dan tanpa mock_user, baru redirect ke /masuk
  if (isDashboardRoute && !hasAuthCookie && !hasMockUser) {
    const url = request.nextUrl.clone()
    url.pathname = '/masuk'
    return NextResponse.redirect(url)
  }

  return response
}

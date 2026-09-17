import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, nim, email, password } = await request.json()
    const userNim = (nim || email || '').trim().toLowerCase()

    if (!name || !userNim || !password) {
      return NextResponse.json({ error: 'Nama, NIM, dan Password wajib diisi' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Kunci server Supabase belum dikonfigurasi' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const authEmail = userNim.includes('@') ? userNim : `${userNim}@kedis.local`

    // Buat user baru di Supabase Auth menggunakan NIM (disintesis ke auth email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { name, nim: userNim }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Pastikan user tercatat di tabel public.users
    if (authData.user) {
      const { error: dbError } = await supabaseAdmin.from('users').upsert({
        id: authData.user.id,
        nim: userNim,
        email: authEmail,
        name: name,
        role: 'viewer'
      })

      if (dbError) {
        console.error('Error syncing to public.users:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Akun petugas ${name} (NIM: ${userNim}) berhasil didaftarkan`,
      user: {
        id: authData.user?.id,
        nim: userNim,
        name
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

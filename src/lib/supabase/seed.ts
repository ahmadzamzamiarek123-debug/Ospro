import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Harap cek NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function seed() {
  console.log('=== MEMULAI SEEDING DATA DUMMY OSI HIMASI 2026 ===\n')

  // 1. Akun Super Admin
  const adminNim = 'admin'
  const adminEmail = 'admin@kedis.local'
  const adminPass = 'admin12345'
  const adminName = 'Super Admin Kedis'

  console.log(`1. Mendaftarkan Super Admin: NIM ${adminNim} (${adminEmail})...`)
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPass,
    email_confirm: true,
    user_metadata: { name: adminName, nim: adminNim }
  })

  let adminId = adminAuth?.user?.id
  if (adminAuthErr && adminAuthErr.message.includes('already registered')) {
    console.log('   -> Akun admin sudah terdaftar, mencari ID...')
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    adminId = existingUsers?.users.find(u => u.email === adminEmail)?.id
  }

  if (adminId) {
    await supabase.from('users').upsert({
      id: adminId,
      nim: adminNim,
      email: adminEmail,
      name: adminName,
      role: 'admin'
    })
    console.log('   -> Super Admin siap di database!')
  }

  // 2. Akun Petugas Komdis
  const officerNim = '20240002'
  const officerEmail = '20240002@kedis.local'
  const officerPass = 'komdis12345'
  const officerName = 'Captain Sarah (Petugas Komdis)'

  console.log(`\n2. Mendaftarkan Petugas Komdis: NIM ${officerNim} (${officerEmail})...`)
  const { data: officerAuth, error: officerAuthErr } = await supabase.auth.admin.createUser({
    email: officerEmail,
    password: officerPass,
    email_confirm: true,
    user_metadata: { name: officerName, nim: officerNim }
  })

  let officerId = officerAuth?.user?.id
  if (officerAuthErr && officerAuthErr.message.includes('already registered')) {
    console.log('   -> Akun petugas sudah terdaftar, mencari ID...')
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    officerId = existingUsers?.users.find(u => u.email === officerEmail)?.id
  }

  if (officerId) {
    await supabase.from('users').upsert({
      id: officerId,
      nim: officerNim,
      email: officerEmail,
      name: officerName,
      role: 'viewer'
    })
    console.log('   -> Petugas Komdis siap di database!')
  }

  // 3. Sesi OSI (Hari 1 s/d 4)
  console.log('\n3. Menyiapkan Sesi OSI (1, 2, 3, 4)...')
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const day3 = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  const day4 = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]

  const sessions = [
    { session_number: 1, date: today, is_active: true },
    { session_number: 2, date: tomorrow, is_active: false },
    { session_number: 3, date: day3, is_active: false },
    { session_number: 4, date: day4, is_active: false },
  ]

  await supabase.from('sessions').upsert(sessions, { onConflict: 'date' })
  console.log(`   -> Sesi 1 aktif untuk hari ini (${today})!`)

  // 4. Data 5 Peserta & 1 Panitia
  console.log('\n4. Memasukkan 5 Peserta & 1 Panitia...')
  const dummyMembers = [
    { nim: '26001', name: 'Ahmad Fauzi', role: 'peserta', kelompok: 'Kelompok 1' },
    { nim: '26002', name: 'Bunga Citra', role: 'peserta', kelompok: 'Kelompok 1' },
    { nim: '26003', name: 'Dimas Anggara', role: 'peserta', kelompok: 'Kelompok 2' },
    { nim: '26004', name: 'Eka Rahmawati', role: 'peserta', kelompok: 'Kelompok 2' },
    { nim: '26005', name: 'Fikri Maulana', role: 'peserta', kelompok: 'Kelompok 3' },
    { nim: 'P001', name: 'Rian Saputra', role: 'panitia', kelompok: null },
  ]

  const { data: insertedMembers, error: memberErr } = await supabase
    .from('members')
    .upsert(dummyMembers, { onConflict: 'nim' })
    .select()

  if (memberErr) {
    console.error('   -> Gagal input member:', memberErr.message)
  } else {
    console.log('   -> Berhasil memasukkan 5 Peserta dan 1 Panitia!')
  }

  // 5. Data Sample Pelanggaran & Apresiasi
  console.log('\n5. Menambahkan contoh data pelanggaran & apresiasi awal...')
  if (insertedMembers && insertedMembers.length > 0) {
    const ahmad = insertedMembers.find(m => m.nim === '26001')
    const bunga = insertedMembers.find(m => m.nim === '26002')

    if (ahmad && bunga) {
      await supabase.from('violations').insert([
        {
          member_id: ahmad.id,
          violation_type: 'ringan',
          session_number: 1,
          violation_category: 'Terlambat 5–10 menit',
          consequence: 'Teguran + catatan + refleksi singkat',
          status: 'pending',
          chronology: 'Terlambat 7 menit saat upacara pembukaan sesi 1',
          recorded_by: officerId || adminId
        },
        {
          member_id: bunga.id,
          violation_type: 'baik',
          session_number: 1,
          violation_category: 'Keaktifan bertanya / menjawab materi',
          consequence: 'Apresiasi keaktifan peserta',
          status: 'selesai',
          chronology: 'Aktif merespon dan mengajukan pertanyaan di sesi materi pertama',
          recorded_by: officerId || adminId
        }
      ])
      console.log('   -> Contoh data pelanggaran SOP HIMASI 2026 berhasil ditambahkan!')
    }
  }

  console.log('\n=============================================')
  console.log('🎉 SEEDING SELESAI & SIAP DITEST!')
  console.log('=============================================')
}

seed()

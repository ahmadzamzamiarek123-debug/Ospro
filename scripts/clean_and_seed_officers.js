const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Supabase URL or SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEFAULT_PASSWORD = 'pwosi2026';

const NEW_OFFICERS = [
  { name: 'Moh. Fahrur Rozi', nim: '25120015' },
  { name: 'Ailsa Atikah Azaria', nim: '25120017' },
  { name: 'Ahmad Yardan Alim Al-Haidi', nim: '25120025' },
  { name: 'Yelvi Nofrijal', nim: '25120074' },
  { name: 'Allan Rahman Ubaedillah', nim: '25120048' },
  { name: 'Diky Septyan Hidayat', nim: '25120039' },
  { name: 'Faizatul Siti Nur Azizah Finanda Putri', nim: '25120050' },
];

async function main() {
  console.log('=== MEMULAI PEMBERSIHAN DATABASE DAN INPUT PETUGAS BARU ===\n');

  // 1. Hapus semua log uji coba (Presensi, Pelanggaran, Cek Atribut)
  console.log('[1/5] Menghapus semua data log uji coba...');
  
  const { error: errAtt } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(' - Hapus tabel attendance:', errAtt ? `Error: ${errAtt.message}` : 'BERHASIL (Bersih)');

  const { error: errViol } = await supabase.from('violations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(' - Hapus tabel violations:', errViol ? `Error: ${errViol.message}` : 'BERHASIL (Bersih)');

  const { error: errAttr } = await supabase.from('attribute_checks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(' - Hapus tabel attribute_checks:', errAttr ? `Error: ${errAttr.message}` : 'BERHASIL (Bersih)');

  // 2. Hapus semua akun panitia / petugas lama (kecuali superadmin)
  console.log('\n[2/5] Menghapus akun panitia/petugas lama...');
  const { data: existingUsers, error: uErr } = await supabase.from('users').select('*');
  if (uErr) {
    console.error(' - Error fetch users:', uErr.message);
  } else {
    for (const u of existingUsers) {
      if (u.role !== 'admin' && u.nim !== '25120030') {
        console.log(` - Menghapus akun lama: ${u.name} (NIM: ${u.nim}, ID: ${u.id})`);
        await supabase.from('users').delete().eq('id', u.id);
        try {
          await supabase.auth.admin.deleteUser(u.id);
        } catch (e) {
          // ignore
        }
      } else {
        console.log(` - Menyimpan Super Admin: ${u.name} (NIM: ${u.nim})`);
      }
    }
  }

  // 3. Update password Super Admin menjadi '123Zamzami'
  console.log('\n[3/5] Memperbarui password Super Admin menjadi 123Zamzami...');
  const { data: adminUser } = await supabase.from('users').select('*').eq('role', 'admin').single();
  if (adminUser) {
    const { error: adminPassErr } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: '123Zamzami'
    });
    console.log(' - Password Super Admin updated:', adminPassErr ? adminPassErr.message : 'BERHASIL (123Zamzami)');
  }

  // 4. Mendaftarkan 7 petugas baru
  console.log('\n[4/5] Mendaftarkan 7 petugas baru dengan password default "pwosi2026"...');
  for (const officer of NEW_OFFICERS) {
    const cleanNim = officer.nim.trim().toLowerCase();
    const email = `${cleanNim}@kedis.local`;

    // Pastikan tidak ada akun sisa dengan email ini
    try {
      // Cek apakah ada di public.users
      await supabase.from('users').delete().eq('nim', cleanNim);
    } catch {
      // ignore
    }

    // Buat di Supabase Auth
    let authUserId = null;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: officer.name, nim: cleanNim }
    });

    if (authErr) {
      console.log(` ! Notice saat membuat Auth ${cleanNim}: ${authErr.message}`);
      // Jika email sudah ada di auth, coba cari user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const match = users?.find(u => u.email === email);
      if (match) {
        authUserId = match.id;
        await supabase.auth.admin.updateUserById(match.id, { password: DEFAULT_PASSWORD });
      }
    } else {
      authUserId = authData?.user?.id;
    }

    if (authUserId) {
      // Simpan ke public.users
      const { error: dbErr } = await supabase.from('users').upsert({
        id: authUserId,
        nim: cleanNim,
        email,
        name: officer.name,
        role: 'viewer'
      });
      if (dbErr) {
        console.error(` - Error sync ke public.users (${cleanNim}):`, dbErr.message);
      } else {
        console.log(` ✓ Berhasil daftarkan: ${officer.name} (NIM: ${cleanNim})`);
      }
    } else {
      console.error(` ✗ Gagal mendapatkan User ID untuk ${officer.name} (${cleanNim})`);
    }
  }

  // 5. Verifikasi status akhir database
  console.log('\n[5/5] Memverifikasi status akhir database...');
  const { count: finalMembers } = await supabase.from('members').select('*', { count: 'exact', head: true });
  const { count: finalAtt } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
  const { count: finalViol } = await supabase.from('violations').select('*', { count: 'exact', head: true });
  const { count: finalChecks } = await supabase.from('attribute_checks').select('*', { count: 'exact', head: true });
  const { data: finalUsers } = await supabase.from('users').select('nim, name, role').order('role');

  console.log('----------------------------------------------------');
  console.log(`Total Peserta (members)      : ${finalMembers} (Utuh)`);
  console.log(`Total Presensi (attendance)  : ${finalAtt} (Bersih)`);
  console.log(`Total Pelanggaran (violations): ${finalViol} (Bersih)`);
  console.log(`Total Cek Atribut (checks)   : ${finalChecks} (Bersih)`);
  console.log(`Total Pengguna (users)       : ${finalUsers?.length}`);
  console.log('----------------------------------------------------');
  console.log('Daftar Akun yang Aktif:');
  finalUsers?.forEach((u, i) => {
    console.log(` ${i + 1}. [${u.role.toUpperCase()}] ${u.name} (NIM: ${u.nim}) -> Pass: ${DEFAULT_PASSWORD}`);
  });
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});

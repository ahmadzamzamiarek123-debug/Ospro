-- ==============================================================================
-- KEDIS - SISTEM KEDISIPLINAN & PRESENSI OSPRO HIMASI 2026
-- SKRIP DATABASE RESMI (PRODUCTION READY - BERSIH TANPA DATA DUMMY)
-- ==============================================================================
-- Petunjuk Penggunaan di Supabase:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Masuk ke menu "SQL Editor"
-- 3. Klik "New Query", paste seluruh skrip ini, lalu klik "Run" (tombol hijau)
-- ==============================================================================

-- Pastikan ekstensi pgcrypto aktif untuk enkripsi password auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABEL USERS (Panitia Login / Super Admin)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nim TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'viewer')) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABEL MEMBERS (Peserta & Panitia yang Dipantau)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nim TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('panitia', 'peserta')) NOT NULL DEFAULT 'peserta',
  kelompok TEXT DEFAULT 'Kelompok 1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABEL SESSIONS (Sesi OSPRO 1 s/d 4)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_number INT CHECK (session_number IN (1, 2, 3, 4)) NOT NULL,
  date DATE UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE NOT NULL
);

-- 4. TABEL VIOLATIONS (Pencatatan Pelanggaran & Apresiasi SOP HIMASI)
CREATE TABLE IF NOT EXISTS public.violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  violation_type TEXT CHECK (violation_type IN ('ringan', 'sedang', 'berat', 'baik')) NOT NULL,
  session_number INT NOT NULL,
  violation_category TEXT NOT NULL,
  consequence TEXT,
  status TEXT CHECK (status IN ('pending', 'selesai')) DEFAULT 'pending' NOT NULL,
  chronology TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABEL ATTENDANCE (Presensi Barcode QR & Manual)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  session_number INT NOT NULL,
  status TEXT CHECK (status IN ('hadir', 'terlambat', 'izin', 'sakit', 'alpha')) DEFAULT 'hadir' NOT NULL,
  method TEXT CHECK (method IN ('qr_scan', 'manual_operator')) DEFAULT 'qr_scan' NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT,
  UNIQUE (member_id, session_number)
);

-- 6. AKTIFKAN ROW LEVEL SECURITY (RLS) & KEBIJAKAN AKSES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Akses Penuh Users" ON public.users;
    DROP POLICY IF EXISTS "Akses Penuh Members" ON public.members;
    DROP POLICY IF EXISTS "Akses Penuh Sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Akses Penuh Violations" ON public.violations;
    DROP POLICY IF EXISTS "Akses Penuh Attendance" ON public.attendance;
END $$;

CREATE POLICY "Akses Penuh Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Violations" ON public.violations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh Attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- 7. TRIGGER OTOMATIS: SINKRONISASI AUTH -> PUBLIC.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nim, email, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nim', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Petugas Baru'),
    COALESCE(new.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO UPDATE SET
    nim = EXCLUDED.nim,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. INITIAL SEED: SESI 1 S/D 4
INSERT INTO public.sessions (session_number, date, is_active)
VALUES
  (1, CURRENT_DATE, TRUE),
  (2, CURRENT_DATE + INTERVAL '1 day', FALSE),
  (3, CURRENT_DATE + INTERVAL '2 day', FALSE),
  (4, CURRENT_DATE + INTERVAL '3 day', FALSE)
ON CONFLICT (date) DO NOTHING;

-- 9. INITIAL SEED: 1 AKUN SUPER ADMIN
-- Silakan ganti nilai 'admin' dan 'admin12345' jika ingin NIM dan password pribadi Anda:
DO $$
DECLARE
  v_admin_uid UUID := gen_random_uuid();
  v_admin_nim TEXT := 'admin';          -- << Ganti dengan NIM Anda jika mau
  v_admin_pass TEXT := 'admin12345';    -- << Ganti dengan Password Anda jika mau
  v_admin_name TEXT := 'Super Admin';
  v_admin_email TEXT;
BEGIN
  v_admin_email := v_admin_nim || '@kedis.local';

  -- Buat user di auth.users Supabase
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_uid,
    'authenticated',
    'authenticated',
    v_admin_email,
    crypt(v_admin_pass, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', v_admin_name, 'nim', v_admin_nim, 'role', 'admin'),
    NOW(),
    NOW(),
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  -- Pastikan terdaftar sebagai admin di public.users
  INSERT INTO public.users (id, nim, email, name, role)
  VALUES (v_admin_uid, v_admin_nim, v_admin_email, v_admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', nim = EXCLUDED.nim;

  RAISE NOTICE 'Selesai! Akun Super Admin siap digunakan dengan NIM: %', v_admin_nim;
END $$;

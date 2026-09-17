-- BERSIHKAN TABEL LAMA (Opsional, gunakan jika ingin reset total)
-- DROP TABLE IF EXISTS violations;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS members;
-- DROP TABLE IF EXISTS users;

-- 1. Tabel Users (Sinkronisasi dengan Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nim TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'viewer')) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabel Members (Peserta & Panitia)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nim TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('panitia', 'peserta')) NOT NULL DEFAULT 'peserta',
  kelompok TEXT DEFAULT 'Kelompok 1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabel Sessions (Sesi OSPRO)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_number INT CHECK (session_number IN (1, 2, 3, 4)) NOT NULL,
  date DATE UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE NOT NULL
);

-- 4. Tabel Violations (Pencatatan Pelanggaran)
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

-- 5. Tabel Attendance (Presensi Kehadiran)
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

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses (Policies)
-- Untuk development, kita beri akses penuh agar tidak ada kendala izin
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable full access for everyone" ON public.users;
    DROP POLICY IF EXISTS "Enable full access for everyone" ON public.members;
    DROP POLICY IF EXISTS "Enable full access for everyone" ON public.sessions;
    DROP POLICY IF EXISTS "Enable full access for everyone" ON public.violations;
    DROP POLICY IF EXISTS "Enable full access for everyone" ON public.attendance;
END $$;

CREATE POLICY "Enable full access for everyone" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable full access for everyone" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable full access for everyone" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable full access for everyone" ON public.violations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable full access for everyone" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- Fungsi otomatis untuk mencatat user baru ke tabel public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nim, email, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nim', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'User Baru'),
    COALESCE(new.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO UPDATE SET
    nim = EXCLUDED.nim,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger otomatis
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Skrip Migrasi (Jika tabel sudah ada di Supabase)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nim TEXT UNIQUE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS kelompok TEXT DEFAULT 'Kelompok 1';
ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS consequence TEXT;
ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'selesai')) DEFAULT 'pending';
ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS chronology TEXT;

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
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable full access for everyone" ON public.attendance FOR ALL USING (true) WITH CHECK (true);



-- ==============================================================================
-- KEDIS - SKRIP DATABASE TABEL ATRIBUT PESERTA (OSI USG 2026)
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard -> Masuk menu "SQL Editor"
-- 2. Klik "New Query", paste skrip ini, lalu klik "Run"
-- ==============================================================================

-- 1. TABEL ATTRIBUTE_ITEMS (Daftar Atribut Dinamis per Sesi)
CREATE TABLE IF NOT EXISTS public.attribute_items (
  id TEXT PRIMARY KEY,
  session_number INT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dresscode', 'atribut', 'tugas')),
  detail TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABEL ATTRIBUTE_CHECKS (Hasil Pemeriksaan Atribut per Maba per Sesi)
CREATE TABLE IF NOT EXISTS public.attribute_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  session_number INT NOT NULL,
  status TEXT CHECK (status IN ('lengkap', 'tidak_lengkap')) NOT NULL DEFAULT 'lengkap',
  checked_items TEXT[] DEFAULT '{}',
  missing_items TEXT[] DEFAULT '{}',
  notes TEXT,
  checked_by TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (member_id, session_number)
);

-- 3. AKTIFKAN RLS & POLICIES
ALTER TABLE public.attribute_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_checks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attribute_items' AND policyname = 'Allow all for attribute_items'
  ) THEN
    CREATE POLICY "Allow all for attribute_items" ON public.attribute_items FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attribute_checks' AND policyname = 'Allow all for attribute_checks'
  ) THEN
    CREATE POLICY "Allow all for attribute_checks" ON public.attribute_checks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

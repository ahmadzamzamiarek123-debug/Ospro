-- ==============================================================================
-- KEDIS - SKRIP DATABASE TABEL ATRIBUT PESERTA (OSI USG 2026)
-- ==============================================================================
-- Petunjuk Eksekusi:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/gxurepfvxoijonntbcga/sql/new
-- 2. Paste seluruh kode SQL ini ke editor
-- 3. Klik tombol "Run" (atau Ctrl+Enter)
-- 4. Buka kembali halaman /atribut di web KEDIS
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

-- 4. SEED DATA ATRIBUT DEFAULT SESUAI HANDBOOK RESMI OSI USG 2026
-- DAY 1
INSERT INTO public.attribute_items (id, session_number, name, category, detail, order_index) VALUES
  ('d1_kemeja', 1, 'Kemeja putih', 'dresscode', 'Lengan panjang rapi', 1),
  ('d1_celana', 1, 'Celana kain hitam', 'dresscode', 'Standar non-jeans', 2),
  ('d1_pantofel', 1, 'Sepatu pantofel', 'dresscode', 'Pantofel formal', 3),
  ('d1_kaoskaki', 1, 'Kaos kaki putih', 'dresscode', 'Warna putih polos', 4),
  ('d1_ikatpinggang', 1, 'Ikat pinggang warna hitam', 'dresscode', 'Standar formal', 5),
  ('d1_hijab', 1, 'Hijab hitam segi empat paris', 'dresscode', 'No rawis (khusus mahasiswi)', 6),
  ('d1_nametag', 1, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d1_bulu', 1, 'Bulu Ayam satu helai warna putih', 'atribut', '1 helai bersih', 8),
  ('d1_tumbler', 1, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d1_konsumsi', 1, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d1_snack', 1, '3pcs Snack berwarna HIJAU', 'atribut', 'Kemasan dominan hijau', 11),
  ('d1_tugas_logo', 1, 'Gambar Logo HIMASI (kertas A4)', 'tugas', 'Tulis tangan manual, dilarang jiplak', 12)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  detail = EXCLUDED.detail,
  order_index = EXCLUDED.order_index;

-- DAY 2
INSERT INTO public.attribute_items (id, session_number, name, category, detail, order_index) VALUES
  ('d2_batik', 2, 'Baju Batik', 'dresscode', 'Batik sopan & rapi', 1),
  ('d2_celana', 2, 'Bawahan hitam', 'dresscode', 'Celana kain hitam / Rok hitam panjang sopan (non-jeans)', 2),
  ('d2_pantofel', 2, 'Sepatu pantofel', 'dresscode', 'Pantofel formal', 3),
  ('d2_kaoskaki', 2, 'Kaos kaki Kanan PUTIH, Kiri HITAM', 'dresscode', 'Kanan putih, kiri hitam', 4),
  ('d2_rafia', 2, 'Tali rafia warna kelompok (ikat pinggang)', 'dresscode', 'Dijadikan ikat pinggang sesuai warna kelompok', 5),
  ('d2_hijab', 2, 'Hijab hitam', 'dresscode', 'Khusus mahasiswi', 6),
  ('d2_nametag', 2, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d2_bulu', 2, 'Bulu Ayam dari DAY 1', 'atribut', 'Lanjutan dari hari pertama (dikumpulkan saat registrasi)', 8),
  ('d2_tumbler', 2, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d2_konsumsi', 2, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d2_snack', 2, '3pcs Snack berwarna PUTIH', 'atribut', 'Kemasan dominan putih', 11),
  ('d2_notebook', 2, 'Notebook', 'atribut', 'Buku catatan / notebook', 12),
  ('d2_tugas_logo', 2, 'Logo HIMASI', 'tugas', 'Wajib disiapkan/dibawa', 13),
  ('d2_tugas_materi', 2, 'Rangkuman Materi 1, 2, 3, & 4', 'tugas', 'Materi 1 (Ke-prodian), Materi 2 (HIMASI), Materi 3 (Kewarganegaraan), Materi 4 (Organisasi & Kepemimpinan)', 14),
  ('d2_tugas_aboutme', 2, 'About Me Pribadi', 'tugas', 'Diketik rapi, dilengkapi foto diri, dicetak pada kertas HVS A4', 15),
  ('d2_tugas_teman', 2, 'Rangkuman About Me 5 Teman', 'tugas', 'Ditulis tangan pada kertas folio, ada Nama, NIM, Kelompok dari 5 teman yang ditemui', 16)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  detail = EXCLUDED.detail,
  order_index = EXCLUDED.order_index;

-- DAY 3
INSERT INTO public.attribute_items (id, session_number, name, category, detail, order_index) VALUES
  ('d3_kaos', 3, 'Kaos putih lengan panjang', 'dresscode', 'Kaos sopan lengan panjang', 1),
  ('d3_training', 3, 'Celana training hitam', 'dresscode', 'Tidak boleh ketat', 2),
  ('d3_sepatu', 3, 'Sepatu Sport (bebas warna)', 'dresscode', 'Sepatu olahraga', 3),
  ('d3_topi', 3, 'Topi hitam polos', 'dresscode', 'Polos tanpa logo mencolok', 4),
  ('d3_rafia', 3, 'Tali rafia warna kelompok (panjang 1 meter)', 'dresscode', 'Panjang 1 meter sesuai warna kelompok', 5),
  ('d3_hijab', 3, 'Hijab sport hitam', 'dresscode', 'Khusus mahasiswi', 6),
  ('d3_nametag', 3, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d3_bulu', 3, 'Bulu Ayam dari DAY 2', 'atribut', 'Lanjutan dari hari sebelumnya', 8),
  ('d3_tumbler', 3, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d3_konsumsi', 3, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d3_snack', 3, '5pcs Jajanan Tradisional (bebas)', 'atribut', 'Jajanan pasar / tradisional', 11)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  detail = EXCLUDED.detail,
  order_index = EXCLUDED.order_index;


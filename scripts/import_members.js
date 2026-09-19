/**
 * Script Pengimpor Data Peserta OSPRO 2026 ke Supabase
 * Mendukung file CSV (.csv) atau JSON (.json)
 *
 * Cara Menjalankan:
 * node scripts/import_members.js <path-ke-file-csv-atau-json>
 *
 * Contoh:
 * node scripts/import_members.js data_maba.csv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxurepfvxoijonntbcga.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dXJlcGZ2eG9pam9ubnRiY2dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY3NjIyMCwiZXhwIjoyMTA1MjUyMjIwfQ.HM2mM-rqF9Rke4GwTEiw-aOhlIOckantFBxMC3zpaVc';

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Supabase URL atau SUPABASE_SERVICE_ROLE_KEY belum disetel di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Parser CSV sederhana & handal (tanpa dependensi luar)
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Deteksi pemisah (koma atau titik koma)
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Split dengan regex untuk menangani kutip
    const values = currentLine.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length === headers.length || values.length >= 2) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  return rows;
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Penggunaan: node scripts/import_members.js <nama-file.csv>');
    console.log('Contoh: node scripts/import_members.js peserta.csv');
    process.exit(0);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File tidak ditemukan: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Membaca file: ${fullPath} ...`);
  const raw = fs.readFileSync(fullPath, 'utf8');

  let rawList = [];
  if (fullPath.endsWith('.json')) {
    rawList = JSON.parse(raw);
  } else {
    rawList = parseCSV(raw);
  }

  console.log(`Ditemukan ${rawList.length} baris data peserta.`);

  if (rawList.length === 0) {
    console.log('Tidak ada data yang dapat diproses.');
    return;
  }

  // Normalisasi kolom
  const membersToInsert = rawList.map((r, idx) => {
    const nim = (r.nim || r.NIM || r['nomor induk'] || r['no induk'] || '').toString().trim();
    const name = (r.name || r.nama || r.NAMA || r['nama lengkap'] || `Peserta ${idx + 1}`).trim();
    let kelompok = (r.kelompok || r.KELOMPOK || r.grup || r.group || 'Kelompok 1').trim();
    if (!kelompok.toLowerCase().startsWith('kelompok')) {
      kelompok = `Kelompok ${kelompok}`;
    }
    const pendamping = (r.pendamping || r.lo || r.mentor || r.kakak || '').trim();
    const no_wa_pendamping = (r.no_wa_pendamping || r.wa || r.telepon || r.whatsapp || '').trim();

    return {
      nim,
      name,
      role: 'peserta',
      kelompok,
      pendamping: pendamping || null,
      no_wa_pendamping: no_wa_pendamping || null
    };
  }).filter(m => m.nim.length > 0);

  console.log(`Memproses ${membersToInsert.length} data valid dengan NIM...`);

  // Batch insert/upsert (per 50 data)
  const batchSize = 50;
  let totalSuccess = 0;

  for (let i = 0; i < membersToInsert.length; i += batchSize) {
    const batch = membersToInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'nim' });

    if (error) {
      console.error(`Gagal pada baris ke-${i + 1}:`, error.message);
    } else {
      totalSuccess += batch.length;
      console.log(`✓ Berhasil mengimpor ${totalSuccess} / ${membersToInsert.length} peserta...`);
    }
  }

  console.log(`\nSELESAI! Total ${totalSuccess} peserta berhasil disimpan di database Supabase!`);
}

run().catch(err => {
  console.error('Error proses:', err);
});

/**
 * Script Pengimpor Data Peserta OSPRO 2026 ke Supabase
 * Mendukung format grup maupun tabular standar.
 *
 * Cara Menjalankan:
 * node scripts/import_members.js [path-ke-file-csv-atau-json]
 *
 * Contoh:
 * node scripts/import_members.js data/peserta_ospro_2026.csv
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

function parseContent(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Periksa apakah format kelompok berblok
  const isGrouped = lines.some(l => l.startsWith('Kelompok ') && l.includes('Pendamping:'));

  if (isGrouped) {
    let currentKelompok = 'Kelompok 1';
    const members = [];

    for (const line of lines) {
      if (line.startsWith('Kelompok ') && line.includes('Pendamping:')) {
        const match = line.match(/^Kelompok\s+(\d+)/i);
        if (match) {
          currentKelompok = 'Kelompok ' + match[1];
        }
        continue;
      }
      if (line.startsWith('No,') || line.startsWith(',Nama Pendamping')) {
        continue;
      }
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 3 && /^\d+$/.test(parts[0]) && parts[2].length >= 7) {
        members.push({
          nim: parts[2],
          name: parts[1],
          role: 'peserta',
          kelompok: currentKelompok
        });
      }
    }
    return members;
  }

  // Fallback: format CSV tabular biasa
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length >= 2) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      const nim = (row.nim || row['nomor induk'] || '').trim();
      const name = (row.name || row.nama || `Peserta ${i}`).trim();
      let kelompok = (row.kelompok || 'Kelompok 1').trim();
      if (!kelompok.toLowerCase().startsWith('kelompok')) {
        kelompok = `Kelompok ${kelompok}`;
      }
      if (nim) {
        rows.push({
          nim,
          name,
          role: 'peserta',
          kelompok
        });
      }
    }
  }
  return rows;
}

async function run() {
  const filePath = process.argv[2] || 'data/peserta_ospro_2026.csv';
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File tidak ditemukan: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Membaca file data: ${fullPath} ...`);
  const raw = fs.readFileSync(fullPath, 'utf8');

  let membersToInsert = [];
  if (fullPath.endsWith('.json')) {
    membersToInsert = JSON.parse(raw);
  } else {
    membersToInsert = parseContent(raw);
  }

  console.log(`Ditemukan ${membersToInsert.length} data peserta valid.`);

  if (membersToInsert.length === 0) {
    console.log('Tidak ada data yang dapat diproses.');
    return;
  }

  // Tampilkan ringkasan per kelompok
  const summary = {};
  membersToInsert.forEach(m => {
    summary[m.kelompok] = (summary[m.kelompok] || 0) + 1;
  });
  console.log('Distribusi per kelompok:', summary);

  // Batch insert/upsert (per 50 data)
  const batchSize = 50;
  let totalSuccess = 0;

  for (let i = 0; i < membersToInsert.length; i += batchSize) {
    const batch = membersToInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'nim' });

    if (error) {
      console.error(`Gagal pada batch ke-${i + 1}:`, error.message);
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

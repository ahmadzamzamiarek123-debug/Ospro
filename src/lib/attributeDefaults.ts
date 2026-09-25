export interface AttributeItem {
  id: string
  session_number: number
  name: string
  category: "dresscode" | "atribut" | "tugas"
  detail?: string
  order_index?: number
}

export const DEFAULT_ATTRIBUTE_ITEMS: AttributeItem[] = [
  // ================= DAY 1 =================
  {
    id: "d1_kemeja",
    session_number: 1,
    name: "Kemeja putih",
    category: "dresscode",
    detail: "Lengan panjang rapi",
    order_index: 1
  },
  {
    id: "d1_celana",
    session_number: 1,
    name: "Celana kain hitam",
    category: "dresscode",
    detail: "Standar non-jeans",
    order_index: 2
  },
  {
    id: "d1_pantofel",
    session_number: 1,
    name: "Sepatu pantofel",
    category: "dresscode",
    detail: "Pantofel formal",
    order_index: 3
  },
  {
    id: "d1_kaoskaki",
    session_number: 1,
    name: "Kaos kaki putih",
    category: "dresscode",
    detail: "Warna putih polos",
    order_index: 4
  },
  {
    id: "d1_ikatpinggang",
    session_number: 1,
    name: "Ikat pinggang warna hitam",
    category: "dresscode",
    detail: "Standar formal",
    order_index: 5
  },
  {
    id: "d1_hijab",
    session_number: 1,
    name: "Hijab hitam segi empat paris",
    category: "dresscode",
    detail: "No rawis (khusus mahasiswi)",
    order_index: 6
  },
  {
    id: "d1_nametag",
    session_number: 1,
    name: "Nametag bekas PKKMB USG 2026",
    category: "atribut",
    detail: "Wajib dipakai/dibawa",
    order_index: 7
  },
  {
    id: "d1_bulu",
    session_number: 1,
    name: "Bulu Ayam satu helai warna putih",
    category: "atribut",
    detail: "1 helai bersih",
    order_index: 8
  },
  {
    id: "d1_tumbler",
    session_number: 1,
    name: "Tumbler berisi air mineral full",
    category: "atribut",
    detail: "Berisi penuh",
    order_index: 9
  },
  {
    id: "d1_konsumsi",
    session_number: 1,
    name: "1pcs Roti + 1pcs Susu Ultra Milk 200ml",
    category: "atribut",
    detail: "Susu rasa bebas",
    order_index: 10
  },
  {
    id: "d1_snack",
    session_number: 1,
    name: "3pcs Snack berwarna HIJAU",
    category: "atribut",
    detail: "Kemasan dominan hijau",
    order_index: 11
  },
  {
    id: "d1_tugas_logo",
    session_number: 1,
    name: "Gambar Logo HIMASI (kertas A4)",
    category: "tugas",
    detail: "Tulis tangan manual, dilarang jiplak",
    order_index: 12
  },

  // ================= DAY 2 =================
  {
    id: "d2_batik",
    session_number: 2,
    name: "Baju Batik",
    category: "dresscode",
    detail: "Batik sopan & rapi",
    order_index: 1
  },
  {
    id: "d2_celana",
    session_number: 2,
    name: "Bawahan hitam",
    category: "dresscode",
    detail: "Celana kain hitam / Rok hitam panjang sopan (non-jeans)",
    order_index: 2
  },
  {
    id: "d2_pantofel",
    session_number: 2,
    name: "Sepatu pantofel",
    category: "dresscode",
    detail: "Pantofel formal",
    order_index: 3
  },
  {
    id: "d2_kaoskaki",
    session_number: 2,
    name: "Kaos kaki Kanan PUTIH, Kiri HITAM",
    category: "dresscode",
    detail: "Kanan putih, kiri hitam",
    order_index: 4
  },
  {
    id: "d2_rafia",
    session_number: 2,
    name: "Tali rafia warna kelompok (ikat pinggang)",
    category: "dresscode",
    detail: "Dijadikan ikat pinggang sesuai warna kelompok",
    order_index: 5
  },
  {
    id: "d2_hijab",
    session_number: 2,
    name: "Hijab hitam",
    category: "dresscode",
    detail: "Khusus mahasiswi",
    order_index: 6
  },
  {
    id: "d2_nametag",
    session_number: 2,
    name: "Nametag bekas PKKMB USG 2026",
    category: "atribut",
    detail: "Wajib dipakai/dibawa",
    order_index: 7
  },
  {
    id: "d2_bulu",
    session_number: 2,
    name: "Bulu Ayam dari DAY 1",
    category: "atribut",
    detail: "Lanjutan dari hari pertama (dikumpulkan saat registrasi)",
    order_index: 8
  },
  {
    id: "d2_tumbler",
    session_number: 2,
    name: "Tumbler berisi air mineral full",
    category: "atribut",
    detail: "Berisi penuh",
    order_index: 9
  },
  {
    id: "d2_konsumsi",
    session_number: 2,
    name: "1pcs Roti + 1pcs Susu Ultra Milk 200ml",
    category: "atribut",
    detail: "Susu rasa bebas",
    order_index: 10
  },
  {
    id: "d2_snack",
    session_number: 2,
    name: "3pcs Snack berwarna PUTIH",
    category: "atribut",
    detail: "Kemasan dominan putih",
    order_index: 11
  },
  {
    id: "d2_notebook",
    session_number: 2,
    name: "Notebook",
    category: "atribut",
    detail: "Buku catatan / notebook",
    order_index: 12
  },
  {
    id: "d2_tugas_logo",
    session_number: 2,
    name: "Logo HIMASI",
    category: "tugas",
    detail: "Wajib disiapkan/dibawa",
    order_index: 13
  },
  {
    id: "d2_tugas_materi",
    session_number: 2,
    name: "Rangkuman Materi 1, 2, 3, & 4",
    category: "tugas",
    detail: "Materi 1 (Ke-prodian), Materi 2 (HIMASI), Materi 3 (Kewarganegaraan), Materi 4 (Organisasi & Kepemimpinan)",
    order_index: 14
  },
  {
    id: "d2_tugas_aboutme",
    session_number: 2,
    name: "About Me Pribadi",
    category: "tugas",
    detail: "Diketik rapi, dilengkapi foto diri, dicetak pada kertas HVS A4",
    order_index: 15
  },
  {
    id: "d2_tugas_teman",
    session_number: 2,
    name: "Rangkuman About Me 5 Teman",
    category: "tugas",
    detail: "Ditulis tangan pada kertas folio, ada Nama, NIM, Kelompok dari 5 teman yang ditemui",
    order_index: 16
  },

  // ================= DAY 3 =================
  // Catatan: Penugasan umum ditiadakan di Day 3 karena Materi 1-4 sudah dikumpulkan di Day 2.
  // Peserta yang masih punya tanggungan tugas dari Day 2 akan mendapatkan item tugas spesifik per NIM.
  {
    id: "d3_kaos",
    session_number: 3,
    name: "Kaos putih lengan panjang",
    category: "dresscode",
    detail: "Kaos sopan lengan panjang",
    order_index: 1
  },
  {
    id: "d3_training",
    session_number: 3,
    name: "Celana training hitam",
    category: "dresscode",
    detail: "Tidak boleh ketat",
    order_index: 2
  },
  {
    id: "d3_sepatu",
    session_number: 3,
    name: "Sepatu Sport (bebas warna)",
    category: "dresscode",
    detail: "Sepatu olahraga",
    order_index: 3
  },
  {
    id: "d3_topi",
    session_number: 3,
    name: "Topi hitam polos",
    category: "dresscode",
    detail: "Polos tanpa logo mencolok",
    order_index: 4
  },
  {
    id: "d3_rafia",
    session_number: 3,
    name: "Tali rafia warna kelompok (panjang 1 meter)",
    category: "dresscode",
    detail: "Panjang 1 meter sesuai warna kelompok",
    order_index: 5
  },
  {
    id: "d3_hijab",
    session_number: 3,
    name: "Hijab sport hitam",
    category: "dresscode",
    detail: "Khusus mahasiswi",
    order_index: 6
  },
  {
    id: "d3_nametag",
    session_number: 3,
    name: "Nametag bekas PKKMB USG 2026",
    category: "atribut",
    detail: "Wajib dipakai/dibawa",
    order_index: 7
  },
  {
    id: "d3_bulu",
    session_number: 3,
    name: "Bulu Ayam dari DAY 2",
    category: "atribut",
    detail: "Lanjutan dari hari sebelumnya",
    order_index: 8
  },
  {
    id: "d3_tumbler",
    session_number: 3,
    name: "Tumbler berisi air mineral full",
    category: "atribut",
    detail: "Berisi penuh",
    order_index: 9
  },
  {
    id: "d3_konsumsi",
    session_number: 3,
    name: "1pcs Roti + 1pcs Susu Ultra Milk 200ml",
    category: "atribut",
    detail: "Susu rasa bebas",
    order_index: 10
  },
  {
    id: "d3_snack",
    session_number: 3,
    name: "5pcs Jajanan Tradisional (bebas)",
    category: "atribut",
    detail: "Jajanan pasar / tradisional",
    order_index: 11
  }
]

// Daftar tanggungan penugasan spesifik per peserta untuk Day 3 (berdasarkan rekap penugasan Day 2)
const ABSENT_DAY2_TASKS: AttributeItem[] = [
  {
    id: "d3_susulan_m12",
    session_number: 3,
    name: "Susulan: Rangkuman Materi Day 1 (Materi 1: Ke-prodian & Materi 2: HIMASI)",
    category: "tugas",
    detail: "Tanggungan karena belum hadir/mengumpulkan di Day 2",
    order_index: 20
  },
  {
    id: "d3_susulan_m34",
    session_number: 3,
    name: "Susulan: Rangkuman Materi Day 2 (Materi 3: Kewarganegaraan & Materi 4: Organisasi)",
    category: "tugas",
    detail: "Tanggungan karena belum hadir/mengumpulkan di Day 2",
    order_index: 21
  },
  {
    id: "d3_susulan_aboutme",
    session_number: 3,
    name: "Susulan: About Me Pribadi",
    category: "tugas",
    detail: "Diketik rapi + foto diri di HVS A4 (tanggungan Day 2)",
    order_index: 22
  },
  {
    id: "d3_susulan_teman",
    session_number: 3,
    name: "Susulan: Rangkuman About Me 5 Teman + Foto",
    category: "tugas",
    detail: "Tulis tangan di kertas folio + foto 5 teman (tanggungan Day 2)",
    order_index: 23
  }
]

export const DAY3_PENDING_TASKS_BY_NIM: Record<string, AttributeItem[]> = {
  // 4 Peserta yang belum hadir / belum cek atribut di Day 2
  "26120007": ABSENT_DAY2_TASKS, // Kia Bayu Mubalek
  "26120010": ABSENT_DAY2_TASKS, // Supriyadi A. Mustapa
  "25120011": ABSENT_DAY2_TASKS, // Farid Syauqi Hanafi
  "26120031": ABSENT_DAY2_TASKS, // MONIKA WANDA TABUN

  // 17 Peserta yang hadir di Day 2 namun memiliki tanggungan/revisi penugasan spesifik
  "26120015": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 20
    }
  ],
  "26120016": [
    {
      id: "d3_susulan_teman_rev",
      session_number: 3,
      name: "Susulan/Revisi: Rangkuman About Me 5 Teman",
      category: "tugas",
      detail: "Catatan Day 2: Biodata temannya tidak jelas",
      order_index: 20
    }
  ],
  "26120018": [
    {
      id: "d3_susulan_aboutme",
      session_number: 3,
      name: "Susulan: About Me Pribadi",
      category: "tugas",
      detail: "Belum mengumpulkan About Me Pribadi di Day 2 (5 Teman sudah)",
      order_index: 20
    }
  ],
  "26120020": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2 (About Me Pribadi sudah)",
      order_index: 20
    }
  ],
  "26120021": [
    {
      id: "d3_susulan_m12",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 1 (Materi 1: Ke-prodian & Materi 2: HIMASI)",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman Materi 1 & 2 di Day 2",
      order_index: 20
    },
    {
      id: "d3_susulan_m34",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 2 (Materi 3: Kewarganegaraan & Materi 4: Organisasi)",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman Materi 3 & 4 di Day 2",
      order_index: 21
    }
  ],
  "26120025": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 20
    }
  ],
  "26120027": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 20
    }
  ],
  "26120028": [
    {
      id: "d3_susulan_aboutme",
      session_number: 3,
      name: "Susulan: About Me Pribadi",
      category: "tugas",
      detail: "Belum mengumpulkan About Me Pribadi di Day 2",
      order_index: 20
    },
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 21
    }
  ],
  "26120035": [
    {
      id: "d3_susulan_m34",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 2 (Materi 3: Kewarganegaraan & Materi 4: Organisasi)",
      category: "tugas",
      detail: "Materi 1 & 2 sudah lengkap, kurang Materi 3 & Materi 4",
      order_index: 20
    }
  ],
  "26120037": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 20
    }
  ],
  "26120038": [
    {
      id: "d3_susulan_teman_rev",
      session_number: 3,
      name: "Susulan/Revisi: Rangkuman About Me 5 Teman",
      category: "tugas",
      detail: "Catatan Day 2: Baru foto 5 & rangkuman aboutme diri sendiri (kurang rangkuman 5 teman)",
      order_index: 20
    }
  ],
  "26120039": [
    {
      id: "d3_susulan_aboutme",
      session_number: 3,
      name: "Susulan: About Me Pribadi",
      category: "tugas",
      detail: "Belum mengumpulkan About Me Pribadi di Day 2",
      order_index: 20
    },
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 21
    }
  ],
  "26120041": [
    {
      id: "d3_susulan_teman_rev",
      session_number: 3,
      name: "Susulan/Revisi: Rangkuman About Me 5 Teman (Kurang 1 Teman)",
      category: "tugas",
      detail: "Catatan Day 2: Rangkuman aboutme kurang 1 teman",
      order_index: 20
    }
  ],
  "26120042": [
    {
      id: "d3_susulan_m12",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 1 (Materi 1: Ke-prodian & Materi 2: HIMASI)",
      category: "tugas",
      detail: "Materi 3 & 4 sudah lengkap, kurang Materi 1 (Ke-prodian) & Materi 2 (HIMASI)",
      order_index: 20
    }
  ],
  "26120043": [
    {
      id: "d3_susulan_m14",
      session_number: 3,
      name: "Susulan: Rangkuman Materi 1 (Ke-prodian) & Materi 4 (Organisasi & Kepemimpinan)",
      category: "tugas",
      detail: "Materi 2 & 3 sudah lengkap, kurang Materi 1 & Materi 4",
      order_index: 20
    },
    {
      id: "d3_susulan_teman_rev",
      session_number: 3,
      name: "Susulan/Revisi: Rangkuman About Me 5 Teman",
      category: "tugas",
      detail: "Catatan Day 2: Kurang lengkap biodata temannya",
      order_index: 21
    }
  ],
  "26120045": [
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman 5 Teman di Day 2",
      order_index: 20
    }
  ],
  "26120046": [
    {
      id: "d3_susulan_m12",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 1 (Materi 1: Ke-prodian & Materi 2: HIMASI)",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman Materi 1 & 2 di Day 2",
      order_index: 20
    },
    {
      id: "d3_susulan_m34",
      session_number: 3,
      name: "Susulan: Rangkuman Materi Day 2 (Materi 3: Kewarganegaraan & Materi 4: Organisasi)",
      category: "tugas",
      detail: "Belum mengumpulkan Rangkuman Materi 3 & 4 di Day 2",
      order_index: 21
    },
    {
      id: "d3_susulan_teman",
      session_number: 3,
      name: "Susulan: Rangkuman About Me 5 Teman + Foto",
      category: "tugas",
      detail: "About Me Pribadi sudah lengkap, kurang Rangkuman 5 Teman",
      order_index: 22
    }
  ]
}

export function getDay3PendingTasksForNim(nim?: string | null): AttributeItem[] {
  if (!nim) return []
  return DAY3_PENDING_TASKS_BY_NIM[nim.trim()] || []
}

export const KELOMPOK_RAFIA_COLORS: Record<string, { color: string; label: string; bgClass: string; textClass: string }> = {
  "kelompok 1": { color: "Hijau", label: "Tali Rafia HIJAU", bgClass: "bg-emerald-50 border-emerald-200", textClass: "text-emerald-700" },
  "kelompok 2": { color: "Pink", label: "Tali Rafia PINK", bgClass: "bg-pink-50 border-pink-200", textClass: "text-pink-700" },
  "kelompok 3": { color: "Biru", label: "Tali Rafia BIRU", bgClass: "bg-blue-50 border-blue-200", textClass: "text-blue-700" },
  "kelompok 4": { color: "Abu-Abu", label: "Tali Rafia ABU-ABU", bgClass: "bg-slate-100 border-slate-300", textClass: "text-slate-700" },
  "kelompok 5": { color: "Kuning", label: "Tali Rafia KUNING", bgClass: "bg-amber-50 border-amber-200", textClass: "text-amber-800" },
}

export function getRafiaForKelompok(kelompok?: string | null) {
  if (!kelompok) return null
  const key = kelompok.toLowerCase().trim()
  return KELOMPOK_RAFIA_COLORS[key] || null
}

export function getDefaultAttributesForSession(sessionNumber: number): AttributeItem[] {
  return DEFAULT_ATTRIBUTE_ITEMS.filter((item) => item.session_number === sessionNumber)
}

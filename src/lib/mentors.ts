export interface MentorInfo {
  pendamping: string
  no_wa_pendamping: string
}

export const MENTORS_MAP: Record<string, MentorInfo> = {
  "Kelompok 1": {
    pendamping: "Dhafin Epand Dhia Azka",
    no_wa_pendamping: "0857-4602-7536"
  },
  "Kelompok 2": {
    pendamping: "Rubiatul Adwia Ansar",
    no_wa_pendamping: "0812-4691-6301"
  },
  "Kelompok 3": {
    pendamping: "Nurul Alwiyah",
    no_wa_pendamping: "0859-5131-1128"
  },
  "Kelompok 4": {
    pendamping: "Riski Ramadani",
    no_wa_pendamping: "0857-4602-7536"
  },
  "Kelompok 5": {
    pendamping: "Joannatan Firdaus",
    no_wa_pendamping: "0858-4398-7188"
  }
}

export function getMentorForKelompok(kelompokName?: string | null): MentorInfo {
  if (!kelompokName) {
    return { pendamping: "Sie Acara / Komdis", no_wa_pendamping: "" }
  }

  // Normalisasi string kelompok
  const normalized = kelompokName.trim()
  if (MENTORS_MAP[normalized]) {
    return MENTORS_MAP[normalized]
  }

  // Coba cari kecocokan angka (1-5)
  const numMatch = normalized.match(/[1-5]/)
  if (numMatch) {
    const key = `Kelompok ${numMatch[0]}`
    if (MENTORS_MAP[key]) {
      return MENTORS_MAP[key]
    }
  }

  return { pendamping: "Sie Acara / Komdis", no_wa_pendamping: "" }
}

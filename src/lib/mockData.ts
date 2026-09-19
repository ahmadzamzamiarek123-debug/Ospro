import { Member, Session, ViolationWithDetails, AttendanceRecord } from "@/types/database"

export const DUMMY_MEMBERS: Member[] = [
  {
    id: "m-001",
    nim: "26001",
    name: "Ahmad Fauzi",
    role: "peserta",
    kelompok: "Kelompok 1",
    created_at: new Date().toISOString()
  },
  {
    id: "m-002",
    nim: "26002",
    name: "Bunga Citra",
    role: "peserta",
    kelompok: "Kelompok 1",
    created_at: new Date().toISOString()
  },
  {
    id: "m-003",
    nim: "26003",
    name: "Dimas Anggara",
    role: "peserta",
    kelompok: "Kelompok 2",
    created_at: new Date().toISOString()
  },
  {
    id: "m-004",
    nim: "26004",
    name: "Eka Rahmawati",
    role: "peserta",
    kelompok: "Kelompok 2",
    created_at: new Date().toISOString()
  },
  {
    id: "m-005",
    nim: "26005",
    name: "Fikri Maulana",
    role: "peserta",
    kelompok: "Kelompok 3",
    created_at: new Date().toISOString()
  },
  {
    id: "p-001",
    nim: "P001",
    name: "Rian Saputra",
    role: "panitia",
    kelompok: "Sie Acara",
    created_at: new Date().toISOString()
  },
  {
    id: "p-002",
    nim: "P002",
    name: "Dinda Kirana",
    role: "panitia",
    kelompok: "Sie Konsumsi",
    created_at: new Date().toISOString()
  }
]

export const DUMMY_SESSION: Session = {
  id: "s-001",
  session_number: 1,
  date: new Date().toISOString().split("T")[0],
  is_active: true
}

export const DUMMY_VIOLATIONS: ViolationWithDetails[] = [
  {
    id: "v-001",
    member_id: "m-001",
    violation_type: "ringan",
    session_number: 1,
    violation_category: "Terlambat 5–10 menit",
    consequence: "Teguran + catatan + refleksi singkat",
    status: "pending",
    chronology: "Terlambat 7 menit saat upacara pembukaan sesi 1 OSI",
    notes: "Terlambat 7 menit saat upacara pembukaan sesi 1 OSI",
    recorded_by: "u-002",
    created_at: new Date().toISOString(),
    member: {
      name: "Ahmad Fauzi",
      nim: "26001",
      kelompok: "Kelompok 1"
    },
    recorder: {
      name: "Captain Sarah (Komdis)"
    }
  },
  {
    id: "v-002",
    member_id: "m-002",
    violation_type: "baik",
    session_number: 1,
    violation_category: "Keaktifan bertanya / menjawab materi",
    consequence: "Apresiasi keaktifan peserta",
    status: "selesai",
    chronology: "Sangat aktif merespon materi arsitektur sistem informasi",
    notes: "Sangat aktif merespon materi arsitektur sistem informasi",
    recorded_by: "u-002",
    created_at: new Date().toISOString(),
    member: {
      name: "Bunga Citra",
      nim: "26002",
      kelompok: "Kelompok 1"
    },
    recorder: {
      name: "Captain Sarah (Komdis)"
    }
  }
]

export const DUMMY_USERS = [
  {
    id: "u-001",
    nim: "admin",
    email: "admin@kedis.local",
    name: "Super Admin Kedis",
    role: "admin" as const,
    created_at: new Date().toISOString()
  },
  {
    id: "u-002",
    nim: "20240002",
    email: "20240002@kedis.local",
    name: "Captain Sarah (Komdis)",
    role: "viewer" as const,
    created_at: new Date().toISOString()
  }
]

export const DUMMY_ATTENDANCE: AttendanceRecord[] = [
  {
    id: "att-001",
    member_id: "m-001",
    session_number: 1,
    status: "hadir" as const,
    method: "qr_scan" as const,
    scanned_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    notes: null
  },
  {
    id: "att-002",
    member_id: "m-002",
    session_number: 1,
    status: "hadir" as const,
    method: "qr_scan" as const,
    scanned_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    notes: null
  }
]


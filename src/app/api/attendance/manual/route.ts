import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DUMMY_ATTENDANCE } from "@/lib/mockData"

export async function POST(request: Request) {
  try {
    const { memberId, sessionNumber = 1, status = "hadir", notes } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "memberId wajib disertakan" }, { status: 400 })
    }

    const supabase = createClient()
    const nowIso = new Date().toISOString()

    const attendanceRecord = {
      member_id: memberId,
      session_number: sessionNumber,
      status: status,
      method: "manual_operator" as const,
      scanned_at: nowIso,
      notes: notes || "Presensi manual oleh operator meja laptop"
    }

    try {
      const { error } = await supabase
        .from("attendance")
        .upsert([attendanceRecord], { onConflict: "member_id,session_number" })

      if (error) {
        console.error("Gagal simpan manual presensi ke Supabase:", error)
      }
    } catch {
      // fallback
    }

    // Update / tambahkan ke mock data
    const existingIndex = DUMMY_ATTENDANCE.findIndex(
      (a) => a.member_id === memberId && a.session_number === sessionNumber
    )
    if (existingIndex >= 0) {
      DUMMY_ATTENDANCE[existingIndex] = {
        ...DUMMY_ATTENDANCE[existingIndex],
        ...attendanceRecord,
        id: DUMMY_ATTENDANCE[existingIndex].id
      }
    } else {
      DUMMY_ATTENDANCE.push({
        id: `att-${Date.now()}`,
        ...attendanceRecord
      })
    }

    return NextResponse.json({
      success: true,
      message: "Peserta berhasil diabsenkan manual oleh operator.",
      record: attendanceRecord
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses presensi manual"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

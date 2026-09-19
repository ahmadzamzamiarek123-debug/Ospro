import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const { error } = await supabase
      .from("attendance")
      .upsert([attendanceRecord], { onConflict: "member_id,session_number" })

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan presensi manual: " + error.message }, { status: 500 })
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

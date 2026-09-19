import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { memberId, sessionNumber = 1, status = "hadir", slot = "awal", notes } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "memberId wajib disertakan" }, { status: 400 })
    }

    const supabase = createClient()
    const nowIso = new Date().toISOString()
    const baseSession = typeof sessionNumber === "string" ? parseInt(sessionNumber, 10) : sessionNumber

    const recordsToUpsert = []

    if (slot === "both") {
      recordsToUpsert.push({
        member_id: memberId,
        session_number: baseSession,
        status: status,
        method: "manual_operator" as const,
        scanned_at: nowIso,
        notes: notes || "Presensi manual operator (Presensi Awal)"
      })
      recordsToUpsert.push({
        member_id: memberId,
        session_number: baseSession + 10,
        status: status,
        method: "manual_operator" as const,
        scanned_at: nowIso,
        notes: notes || "Presensi manual operator (Presensi Akhir)"
      })
    } else if (slot === "akhir") {
      recordsToUpsert.push({
        member_id: memberId,
        session_number: baseSession + 10,
        status: status,
        method: "manual_operator" as const,
        scanned_at: nowIso,
        notes: notes || "Presensi manual operator (Presensi Akhir)"
      })
    } else {
      // Default: awal
      recordsToUpsert.push({
        member_id: memberId,
        session_number: baseSession,
        status: status,
        method: "manual_operator" as const,
        scanned_at: nowIso,
        notes: notes || "Presensi manual operator (Presensi Awal)"
      })
    }

    const { error } = await supabase
      .from("attendance")
      .upsert(recordsToUpsert, { onConflict: "member_id,session_number" })

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan presensi manual: " + error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Peserta berhasil diabsenkan manual oleh operator.",
      records: recordsToUpsert
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses presensi manual"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

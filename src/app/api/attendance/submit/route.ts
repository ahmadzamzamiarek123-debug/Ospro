import { NextResponse } from "next/server"
import { verifyAttendanceToken } from "@/lib/attendanceToken"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { token, nim } = await request.json()

    if (!token || !nim) {
      return NextResponse.json({ error: "Token dan NIM wajib disertakan" }, { status: 400 })
    }

    const verification = verifyAttendanceToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || "Barcode telah kadaluarsa. Silakan scan ulang barcode terbaru di layar laptop.", isExpired: true },
        { status: 400 }
      )
    }

    const sessionNumber = verification.sessionNumber
    const cleanNim = nim.trim()

    // 1. Cari data member
    let member = null
    const supabase = createClient()

    try {
      const { data: dbMember } = await supabase
        .from("members")
        .select("id, nim, name, kelompok, role")
        .eq("nim", cleanNim)
        .single()
      if (dbMember) member = dbMember
    } catch {
      // ignore
    }

    if (!member) {
      return NextResponse.json({ error: `Peserta dengan NIM ${cleanNim} tidak terdaftar di database.` }, { status: 404 })
    }

    // 2. Cek apakah sudah absen di sesi ini
    try {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id, scanned_at")
        .eq("member_id", member.id)
        .eq("session_number", sessionNumber)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "NIM ini sudah tercatat hadir pada sesi ini sebelumnya.", alreadyAttended: true, attendedAt: existing.scanned_at },
          { status: 400 }
        )
      }
    } catch {
      // ignore
    }

    // 3. Catat Kehadiran
    const nowIso = new Date().toISOString()
    const attendanceRecord = {
      member_id: member.id,
      session_number: sessionNumber,
      status: "hadir" as const,
      method: "qr_scan" as const,
      scanned_at: nowIso
    }

    let insertedRecord = null
    try {
      const { data, error } = await supabase
        .from("attendance")
        .insert([attendanceRecord])
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "NIM ini sudah tercatat hadir pada sesi ini.", alreadyAttended: true },
            { status: 400 }
          )
        }
        return NextResponse.json({ error: "Gagal menyimpan presensi: " + error.message }, { status: 500 })
      } else {
        insertedRecord = data
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error"
      return NextResponse.json({ error: "Gagal terhubung ke database: " + message }, { status: 500 })
    }

    if (!insertedRecord) {
      return NextResponse.json({ error: "Gagal mencatat presensi." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Presensi berhasil! Selamat datang, ${member.name}.`,
      member: {
        id: member.id,
        nim: member.nim,
        name: member.name,
        kelompok: member.kelompok || "Tanpa Kelompok"
      },
      sessionNumber,
      scannedAt: nowIso
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses presensi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

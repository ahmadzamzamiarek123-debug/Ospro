import { NextResponse } from "next/server"
import { verifyTicketToken } from "@/lib/ticketToken"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMentorForKelompok } from "@/lib/mentors"

export async function POST(request: Request) {
  try {
    const { token, sessionNumber: requestedSession } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Data barcode tidak terdeteksi." },
        { status: 400 }
      )
    }

    // 1. Verifikasi tanda tangan barcode
    const verification = verifyTicketToken(token)
    if (!verification.valid || !verification.nim) {
      return NextResponse.json(
        { error: verification.error || "Barcode tidak sah atau telah dimodifikasi." },
        { status: 400 }
      )
    }

    const nim = verification.nim.trim().toLowerCase()
    const supabase = createAdminClient()

    // 2. Tentukan Sesi Aktif
    let sessionNumber = requestedSession ? parseInt(requestedSession, 10) : 1
    if (!requestedSession) {
      try {
        const { data: activeSession } = await supabase
          .from("sessions")
          .select("session_number")
          .eq("is_active", true)
          .order("session_number", { ascending: true })
          .limit(1)
          .single()
        if (activeSession) {
          sessionNumber = activeSession.session_number
        }
      } catch {
        sessionNumber = 1
      }
    }

    // 3. Cari Data Peserta di Database
    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id, nim, name, role, kelompok")
      .ilike("nim", nim)
      .single()

    if (memberErr || !member) {
      return NextResponse.json(
        { error: `NIM "${nim.toUpperCase()}" tidak terdaftar dalam database peserta/panitia.` },
        { status: 404 }
      )
    }

    const mentorInfo = getMentorForKelompok(member.kelompok)

    // 4. Periksa Apakah Sudah Pernah Absen di Sesi Ini
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id, scanned_at, status")
      .eq("member_id", member.id)
      .eq("session_number", sessionNumber)
      .single()

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        alreadyAttended: true,
        message: `Sudah tercatat hadir pada pukul ${new Date(existingAttendance.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
        attendedAt: existingAttendance.scanned_at,
        sessionNumber,
        member: {
          id: member.id,
          nim: member.nim,
          name: member.name,
          role: member.role,
          kelompok: member.kelompok || "Tanpa Kelompok",
          pendamping: mentorInfo.pendamping,
          no_wa_pendamping: mentorInfo.no_wa_pendamping || null
        }
      })
    }

    // 5. Simpan Kehadiran Baru
    const nowIso = new Date().toISOString()
    const { error: insertErr } = await supabase.from("attendance").insert({
      member_id: member.id,
      session_number: sessionNumber,
      status: "hadir",
      method: "qr_scan",
      scanned_at: nowIso,
      notes: "Scan Barcode Tiket Kamera HP Panitia"
    })

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({
          success: false,
          alreadyAttended: true,
          message: "Sudah tercatat hadir pada sesi ini sebelumnya.",
          sessionNumber,
          member
        })
      }
      return NextResponse.json(
        { error: "Gagal menyimpan presensi: " + insertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      alreadyAttended: false,
      message: `Presensi Berhasil! Selamat datang, ${member.name}.`,
      sessionNumber,
      scannedAt: nowIso,
      member: {
        id: member.id,
        nim: member.nim,
        name: member.name,
        role: member.role,
        kelompok: member.kelompok || "Tanpa Kelompok",
        pendamping: mentorInfo.pendamping,
        no_wa_pendamping: mentorInfo.no_wa_pendamping || null
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal server"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { verifyTicketToken } from "@/lib/ticketToken"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMentorForKelompok } from "@/lib/mentors"

export async function POST(request: Request) {
  try {
    const { token, sessionNumber: requestedSession, slot: requestedSlot } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Data barcode tidak terdeteksi." },
        { status: 400 }
      )
    }

    // 1. Verifikasi tanda tangan barcode atau NIM manual
    let nim = ""
    if (token.startsWith("OSI-TICKET:v1:") || token.startsWith("KEDIS-TICKET:v1:")) {
      const verification = verifyTicketToken(token)
      if (!verification.valid || !verification.nim) {
        return NextResponse.json(
          { error: verification.error || "Barcode tidak sah atau telah dimodifikasi." },
          { status: 400 }
        )
      }
      nim = verification.nim.trim().toLowerCase()
    } else {
      // Input manual NIM langsung dari form scanner darurat
      nim = token.trim().toLowerCase()
    }

    const supabase = createAdminClient()

    // 2. Tentukan Sesi & Slot (Awal vs Akhir)
    const slot: "awal" | "akhir" = requestedSlot === "akhir" ? "akhir" : "awal"
    const slotLabel = slot === "akhir" ? "Presensi Akhir" : "Presensi Awal"

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

    // Actual session_number stored in database:
    // Sesi 1..3 Awal  -> 1..3
    // Sesi 1..3 Akhir -> 11..13
    const actualSessionNumber = slot === "akhir" ? sessionNumber + 10 : sessionNumber

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

    // 4. Periksa Apakah Sudah Pernah Absen di Slot Ini
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id, scanned_at, status")
      .eq("member_id", member.id)
      .eq("session_number", actualSessionNumber)
      .single()

    if (existingAttendance) {
      return NextResponse.json({
        success: false,
        alreadyAttended: true,
        slot,
        slotLabel,
        message: `Sudah tercatat di ${slotLabel} pada pukul ${new Date(existingAttendance.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
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
      session_number: actualSessionNumber,
      status: "hadir",
      method: "qr_scan",
      scanned_at: nowIso,
      notes: `Scan Barcode Tiket Kamera HP Panitia (${slotLabel})`
    })

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({
          success: false,
          alreadyAttended: true,
          slot,
          slotLabel,
          message: `Sudah tercatat di ${slotLabel} pada sesi ini sebelumnya.`,
          sessionNumber,
          member
        })
      }
      return NextResponse.json(
        { error: "Gagal menyimpan presensi: " + insertErr.message },
        { status: 500 }
      )
    }

    const successMessage = slot === "akhir"
      ? `Presensi Akhir Berhasil! Sampai jumpa, ${member.name}.`
      : `Presensi Awal Berhasil! Selamat datang, ${member.name}.`

    return NextResponse.json({
      success: true,
      alreadyAttended: false,
      slot,
      slotLabel,
      message: successMessage,
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

import { NextResponse } from "next/server"
import { verifyAttendanceToken } from "@/lib/attendanceToken"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const nim = searchParams.get("nim")?.trim()

    if (!token) {
      return NextResponse.json({ error: "Token barcode tidak ditemukan" }, { status: 400 })
    }

    const verification = verifyAttendanceToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || "Barcode tidak valid atau telah kadaluarsa", isExpired: true },
        { status: 400 }
      )
    }

    const sessionNumber = verification.sessionNumber

    if (!nim) {
      // Hanya verifikasi token saja
      return NextResponse.json({
        success: true,
        sessionNumber,
        valid: true
      })
    }

    // Lookup data peserta
    let member = null
    let alreadyAttended = false
    let attendedAt: string | null = null

    try {
      const supabase = createClient()
      const { data: dbMember } = await supabase
        .from("members")
        .select("id, nim, name, kelompok, role")
        .eq("nim", nim)
        .single()

      if (dbMember) {
        member = dbMember
        // Cek status kehadiran
        const { data: dbAtt } = await supabase
          .from("attendance")
          .select("id, scanned_at, status")
          .eq("member_id", dbMember.id)
          .eq("session_number", sessionNumber)
          .single()

        if (dbAtt) {
          alreadyAttended = true
          attendedAt = dbAtt.scanned_at
        }
      }
    } catch {
      // ignore
    }

    if (!member) {
      return NextResponse.json(
        { error: `NIM ${nim} tidak terdaftar dalam database peserta/panitia.` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionNumber,
      member: {
        id: member.id,
        nim: member.nim,
        name: member.name,
        kelompok: member.kelompok || (member.role === "panitia" ? "Panitia" : "Tanpa Kelompok"),
        role: member.role
      },
      alreadyAttended,
      attendedAt
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan sistem"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

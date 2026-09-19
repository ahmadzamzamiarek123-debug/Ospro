import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionParam = searchParams.get("session")
    let sessionNumber = sessionParam ? parseInt(sessionParam, 10) : 1

    const supabase = createClient()
    const timeoutMs = 1200
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
    )

    if (!sessionParam) {
      try {
        const sessionQuery = supabase
          .from("sessions")
          .select("session_number")
          .eq("is_active", true)
          .single()
        const { data: activeSession } = await Promise.race([sessionQuery, timeoutPromise])
        if (activeSession) sessionNumber = activeSession.session_number
      } catch {
        sessionNumber = 1
      }
    }

    // Ambil members & attendances secara paralel dengan timeout race
    let members: Array<{ id: string; nim: string; name: string; role: string; kelompok?: string | null }> = []
    let attendances: Array<{ id: string; member_id: string; status: string; method: string; scanned_at: string }> = []

    try {
      const membersQuery = supabase
        .from("members")
        .select("id, nim, name, role, kelompok")
        .order("name", { ascending: true })

      const attendanceQuery = supabase
        .from("attendance")
        .select("id, member_id, status, method, scanned_at")
        .eq("session_number", sessionNumber)

      const [membersRes, attendanceRes] = await Promise.race([
        Promise.all([membersQuery, attendanceQuery]),
        timeoutPromise
      ])

      if (membersRes?.data) {
        members = membersRes.data
      }
      if (attendanceRes?.data) {
        attendances = attendanceRes.data
      }
    } catch {
      // ignore
    }

    // Petakan data peserta + status presensi
    const attendanceMap = new Map(attendances.map((a) => [a.member_id, a]))

    const result = members.map((m) => {
      const att = attendanceMap.get(m.id)
      return {
        id: m.id,
        nim: m.nim,
        name: m.name,
        role: m.role,
        kelompok: m.kelompok || (m.role === "panitia" ? "Panitia" : "Tanpa Kelompok"),
        isAttended: !!att,
        attendanceStatus: att?.status || null,
        method: att?.method || null,
        scannedAt: att?.scanned_at || null
      }
    })

    const totalPeserta = result.filter((r) => r.role === "peserta").length
    const totalPesertaHadir = result.filter((r) => r.role === "peserta" && r.isAttended).length
    const totalPanitia = result.filter((r) => r.role === "panitia").length
    const totalPanitiaHadir = result.filter((r) => r.role === "panitia" && r.isAttended).length
    const totalSemua = result.length
    const totalHadir = result.filter((r) => r.isAttended).length

    return NextResponse.json({
      success: true,
      sessionNumber,
      totalPeserta,
      totalPesertaHadir,
      totalPanitia,
      totalPanitiaHadir,
      totalSemua,
      totalHadir,
      members: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data presensi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

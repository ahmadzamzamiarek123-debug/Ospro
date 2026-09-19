import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionParam = searchParams.get("session")
    let sessionNumber = sessionParam ? parseInt(sessionParam, 10) : 1

    const supabase = createClient()
    const timeoutMs = 4000
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

    const baseSession = sessionNumber
    const akhirSession = sessionNumber + 10

    // Ambil members & attendances secara paralel dengan timeout race
    let members: Array<{ id: string; nim: string; name: string; role: string; kelompok?: string | null }> = []
    let attendances: Array<{ id: string; member_id: string; session_number: number; status: string; method: string; scanned_at: string }> = []

    try {
      const membersQuery = supabase
        .from("members")
        .select("id, nim, name, role, kelompok")
        .order("name", { ascending: true })

      const attendanceQuery = supabase
        .from("attendance")
        .select("id, member_id, session_number, status, method, scanned_at")
        .in("session_number", [baseSession, akhirSession])

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

    // Petakan data peserta + status presensi untuk Awal & Akhir
    const attendanceAwalMap = new Map<string, typeof attendances[0]>()
    const attendanceAkhirMap = new Map<string, typeof attendances[0]>()

    attendances.forEach((att) => {
      if (att.session_number === baseSession) {
        attendanceAwalMap.set(att.member_id, att)
      } else if (att.session_number === akhirSession) {
        attendanceAkhirMap.set(att.member_id, att)
      }
    })

    const result = members.map((m) => {
      const attAwal = attendanceAwalMap.get(m.id)
      const attAkhir = attendanceAkhirMap.get(m.id)

      const isAwal = !!attAwal
      const isAkhir = !!attAkhir

      let kehadiranState: "lengkap" | "hanya_awal" | "hanya_akhir" | "alpha" = "alpha"
      if (isAwal && isAkhir) {
        kehadiranState = "lengkap"
      } else if (isAwal && !isAkhir) {
        kehadiranState = "hanya_awal" // Waspada: Belum Presensi Akhir
      } else if (!isAwal && isAkhir) {
        kehadiranState = "hanya_akhir"
      } else {
        kehadiranState = "alpha"
      }

      return {
        id: m.id,
        nim: m.nim,
        name: m.name,
        role: m.role,
        kelompok: m.kelompok || (m.role === "panitia" ? "Panitia" : "Tanpa Kelompok"),
        // Compatibility flags
        isAttended: isAwal || isAkhir,
        attendanceStatus: attAwal?.status || attAkhir?.status || null,
        method: attAwal?.method || attAkhir?.method || null,
        scannedAt: attAwal?.scanned_at || attAkhir?.scanned_at || null,
        // Dual Slot details
        awal: {
          isAttended: isAwal,
          scannedAt: attAwal?.scanned_at || null,
          status: attAwal?.status || null,
          method: attAwal?.method || null
        },
        akhir: {
          isAttended: isAkhir,
          scannedAt: attAkhir?.scanned_at || null,
          status: attAkhir?.status || null,
          method: attAkhir?.method || null
        },
        kehadiranState
      }
    })

    // Hitung statistik
    const totalPeserta = result.filter((r) => r.role === "peserta").length
    const totalPesertaAwal = result.filter((r) => r.role === "peserta" && r.awal.isAttended).length
    const totalPesertaAkhir = result.filter((r) => r.role === "peserta" && r.akhir.isAttended).length
    const totalPesertaLengkap = result.filter((r) => r.role === "peserta" && r.kehadiranState === "lengkap").length
    const totalPesertaHanyaAwal = result.filter((r) => r.role === "peserta" && r.kehadiranState === "hanya_awal").length
    const totalPesertaAlpha = result.filter((r) => r.role === "peserta" && r.kehadiranState === "alpha").length

    const totalSemua = result.length
    const totalAwal = result.filter((r) => r.awal.isAttended).length
    const totalAkhir = result.filter((r) => r.akhir.isAttended).length
    const totalLengkap = result.filter((r) => r.kehadiranState === "lengkap").length
    const totalHanyaAwal = result.filter((r) => r.kehadiranState === "hanya_awal").length
    const totalBelumHadir = result.filter((r) => r.kehadiranState === "alpha").length

    return NextResponse.json({
      success: true,
      sessionNumber,
      // Peserta stats
      totalPeserta,
      totalPesertaAwal,
      totalPesertaAkhir,
      totalPesertaLengkap,
      totalPesertaHanyaAwal,
      totalPesertaAlpha,
      // Overall stats
      totalSemua,
      totalAwal,
      totalAkhir,
      totalLengkap,
      totalHanyaAwal,
      totalBelumHadir,
      members: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat data presensi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

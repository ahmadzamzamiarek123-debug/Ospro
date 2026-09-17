import { NextResponse } from "next/server"
import { generateAttendanceToken } from "@/lib/attendanceToken"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionParam = searchParams.get("session")

    let sessionNumber = sessionParam ? parseInt(sessionParam, 10) : 1

    if (!sessionParam) {
      // Cari sesi aktif dari Supabase
      try {
        const supabase = createClient()
        const { data: activeSession } = await supabase
          .from("sessions")
          .select("session_number")
          .eq("is_active", true)
          .single()

        if (activeSession) {
          sessionNumber = activeSession.session_number
        }
      } catch {
        // Fallback default ke sesi 1
        sessionNumber = 1
      }
    }

    const tokenData = generateAttendanceToken(sessionNumber)

    return NextResponse.json({
      success: true,
      ...tokenData
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat token presensi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

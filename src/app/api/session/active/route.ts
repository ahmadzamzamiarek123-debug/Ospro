import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: activeSession, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("is_active", true)
      .order("session_number", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!activeSession) {
      // Jika belum ada sesi aktif, otomatis aktifkan Sesi 1
      const { data: firstSession } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_number", 1)
        .maybeSingle()

      if (firstSession) {
        await supabase
          .from("sessions")
          .update({ is_active: true })
          .eq("id", firstSession.id)
        return NextResponse.json({
          success: true,
          session: { ...firstSession, is_active: true },
          sessionNumber: 1
        })
      } else {
        // Buat sesi default jika tabel kosong
        const today = new Date().toISOString().split("T")[0]
        const { data: created } = await supabase
          .from("sessions")
          .insert({ session_number: 1, date: today, is_active: true })
          .select("*")
          .single()

        return NextResponse.json({
          success: true,
          session: created,
          sessionNumber: 1
        })
      }
    }

    return NextResponse.json({
      success: true,
      session: activeSession,
      sessionNumber: activeSession.session_number
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetSession = parseInt(body.sessionNumber, 10)

    if (isNaN(targetSession) || targetSession < 1 || targetSession > 5) {
      return NextResponse.json(
        { success: false, error: "Nomor sesi tidak valid (harus 1 - 5)." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Nonaktifkan semua sesi
    await supabase
      .from("sessions")
      .update({ is_active: false })
      .neq("session_number", -999)

    // 2. Cek apakah baris sesi target sudah ada di tabel
    const { data: existing } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_number", targetSession)
      .maybeSingle()

    let updatedSession
    if (existing) {
      const { data } = await supabase
        .from("sessions")
        .update({ is_active: true })
        .eq("id", existing.id)
        .select("*")
        .single()
      updatedSession = data
    } else {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("sessions")
        .insert({
          session_number: targetSession,
          date: today,
          is_active: true
        })
        .select("*")
        .single()
      updatedSession = data
    }

    return NextResponse.json({
      success: true,
      sessionNumber: targetSession,
      session: updatedSession,
      message: `Sesi ${targetSession} berhasil diaktifkan secara terpusat!`
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengaktifkan sesi"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

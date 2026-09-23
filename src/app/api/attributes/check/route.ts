import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionParam = searchParams.get("session")
    const memberId = searchParams.get("memberId")
    const sessionNumber = sessionParam ? parseInt(sessionParam, 10) : 1

    const supabase = createAdminClient()

    let query = supabase
      .from("attribute_checks")
      .select("*, member:members(id, nim, name, role, kelompok)")
      .eq("session_number", sessionNumber)

    if (memberId) {
      query = query.eq("member_id", memberId)
      const { data, error } = await query.maybeSingle()
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, check: data })
    }

    const { data, error } = await query.order("checked_at", { ascending: false })
    if (error) {
      // Jika tabel belum dibuat di Supabase, jangan crash, kembalikan array kosong dengan flag needsSql
      return NextResponse.json({
        success: true,
        checks: [],
        warning: "Tabel attribute_checks belum aktif di Supabase. Jalankan file schema_attribute.sql.",
        needsSql: true
      })
    }

    return NextResponse.json({
      success: true,
      checks: data || []
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      memberId,
      sessionNumber = 1,
      status = "lengkap",
      checkedItems = [],
      missingItems = [],
      notes = "",
      checkedByName = "Petugas Sekdis",
      recordViolation = false
    } = body

    if (!memberId) {
      return NextResponse.json({ success: false, error: "memberId wajib disertakan" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Simpan ke tabel attribute_checks
    const { data: checkData, error: checkErr } = await supabase
      .from("attribute_checks")
      .upsert(
        {
          member_id: memberId,
          session_number: sessionNumber,
          status,
          checked_items: checkedItems,
          missing_items: missingItems,
          notes: notes?.trim() || null,
          checked_by: checkedByName,
          checked_at: new Date().toISOString()
        },
        { onConflict: "member_id,session_number" }
      )
      .select("*, member:members(id, nim, name, role, kelompok)")
      .single()

    if (checkErr) {
      if (checkErr.code === "PGRST205") {
        return NextResponse.json({
          success: false,
          error: "Tabel attribute_checks belum dibuat di Supabase. Silakan jalankan file 'supabase/schema_attribute.sql' di SQL Editor Supabase terlebih dahulu.",
          needsSql: true
        }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: checkErr.message }, { status: 500 })
    }

    // 2. Jika ada item yang kurang dan panitia memilih mencatat ke pelanggaran Komdis
    if (recordViolation && missingItems.length > 0) {
      try {
        const violationText = `Atribut/Perlengkapan tidak lengkap: ${missingItems.join(", ")}`
        await supabase.from("violations").insert({
          member_id: memberId,
          violation_type: "ringan",
          session_number: sessionNumber,
          violation_category: "Sanksi Ringan",
          consequence: "Melengkapi atribut pada sesi berikutnya",
          status: "pending",
          chronology: violationText,
          notes: notes ? `${violationText} (Catatan: ${notes})` : violationText,
          recorded_by: null
        })
      } catch {
        // Abaikan kegagalan insert pelanggaran agar tidak membatalkan pemeriksaan atribut
      }
    }

    return NextResponse.json({
      success: true,
      message: status === "lengkap" ? "Pemeriksaan atribut: Lengkap!" : "Pemeriksaan atribut: Tercatat Tidak Lengkap",
      check: checkData
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

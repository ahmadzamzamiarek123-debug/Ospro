import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let violationId = searchParams.get("id")

    if (!violationId) {
      try {
        const body = await request.json()
        violationId = body.id
      } catch {
        // ignore
      }
    }

    if (!violationId) {
      return NextResponse.json({ success: false, error: "ID penilaian wajib disertakan" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Cari dulu data yang akan dihapus untuk audit log / konfirmasi
    const { data: existing, error: findError } = await supabase
      .from("violations")
      .select("id, member_id, violation_type, violation_category, notes")
      .eq("id", violationId)
      .maybeSingle()

    if (findError) {
      return NextResponse.json({ success: false, error: findError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: "Data penilaian tidak ditemukan atau sudah dihapus" }, { status: 404 })
    }

    // Eksekusi penghapusan
    const { error: delError } = await supabase
      .from("violations")
      .delete()
      .eq("id", violationId)

    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Penilaian (${existing.violation_category}) berhasil dihapus`,
      deleted: existing
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AttributeItem, getDefaultAttributesForSession } from "@/lib/attributeDefaults"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionParam = searchParams.get("session")
    const sessionNumber = sessionParam ? parseInt(sessionParam, 10) : 1

    const supabase = createAdminClient()

    // Cek apakah tabel attribute_items ada di Supabase
    const { data: dbItems, error } = await supabase
      .from("attribute_items")
      .select("*")
      .eq("session_number", sessionNumber)
      .order("order_index", { ascending: true })

    if (error) {
      // Jika tabel belum dibuat (PGRST205) atau error lainnya, fallback aman ke data handbook bawaan
      return NextResponse.json({
        success: true,
        source: "default",
        sessionNumber,
        items: getDefaultAttributesForSession(sessionNumber),
        warning: "Menggunakan data bawaan handbook. Jalankan file schema_attribute.sql jika ingin menyimpan perubahan kustom ke database."
      })
    }

    // Jika tabel ada tapi belum ada baris sama sekali, kita auto-seed default items
    if (!dbItems || dbItems.length === 0) {
      const defaultForSession = getDefaultAttributesForSession(sessionNumber)
      try {
        await supabase.from("attribute_items").upsert(defaultForSession)
      } catch {
        // ignore
      }
      return NextResponse.json({
        success: true,
        source: "seeded",
        sessionNumber,
        items: defaultForSession
      })
    }

    return NextResponse.json({
      success: true,
      source: "database",
      sessionNumber,
      items: dbItems
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, sessionNumber = 1, items, item, itemId } = body
    const supabase = createAdminClient()

    if (action === "reset") {
      // Hapus item kustom dan kembalikan ke default handbook
      const defaultItems = getDefaultAttributesForSession(sessionNumber)
      
      const { error: delErr } = await supabase
        .from("attribute_items")
        .delete()
        .eq("session_number", sessionNumber)

      if (delErr) {
        return NextResponse.json({
          success: false,
          error: "Tabel attribute_items belum ada di Supabase. Silakan jalankan skrip supabase/schema_attribute.sql di SQL Editor Supabase terlebih dahulu.",
          needsSql: true
        }, { status: 400 })
      }

      await supabase.from("attribute_items").insert(defaultItems)

      return NextResponse.json({
        success: true,
        message: `Daftar atribut Sesi ${sessionNumber} berhasil di-reset ke standar Handbook!`,
        items: defaultItems
      })
    }

    if (action === "save_all") {
      // Simpan seluruh daftar item yang diedit oleh Superadmin
      if (!Array.isArray(items)) {
        return NextResponse.json({ success: false, error: "Data items tidak valid" }, { status: 400 })
      }

      // Bersihkan properti created_at agar PostgreSQL mengisi DEFAULT NOW() tanpa error NOT NULL
      const cleanItems = items.map((it: Partial<AttributeItem>, idx: number) => ({
        id: it.id || `item_${sessionNumber}_${Date.now()}_${idx}`,
        session_number: Number(it.session_number || sessionNumber),
        name: (it.name || "").trim(),
        category: it.category || "atribut",
        detail: it.detail ? it.detail.trim() : null,
        order_index: typeof it.order_index === "number" ? it.order_index : idx + 1,
      }))

      // Hapus data lama di sesi ini lalu masukkan yang baru
      const { error: delErr } = await supabase
        .from("attribute_items")
        .delete()
        .eq("session_number", sessionNumber)

      if (delErr) {
        return NextResponse.json({
          success: false,
          error: "Tabel attribute_items belum ada di Supabase. Silakan jalankan skrip supabase/schema_attribute.sql di SQL Editor Supabase.",
          needsSql: true
        }, { status: 400 })
      }

      if (cleanItems.length > 0) {
        const { error: insErr } = await supabase.from("attribute_items").insert(cleanItems)
        if (insErr) {
          return NextResponse.json({ success: false, error: insErr.message }, { status: 500 })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Perubahan daftar atribut Sesi ${sessionNumber} berhasil disimpan!`,
        items: cleanItems
      })
    }

    if (action === "add") {
      if (!item || !item.name) {
        return NextResponse.json({ success: false, error: "Nama atribut wajib diisi" }, { status: 400 })
      }

      const newItem: AttributeItem = {
        id: item.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        session_number: item.session_number || sessionNumber,
        name: item.name.trim(),
        category: item.category || "atribut",
        detail: item.detail?.trim() || "",
        order_index: item.order_index || 99
      }

      const { data, error } = await supabase
        .from("attribute_items")
        .insert(newItem)
        .select()
        .single()

      if (error) {
        return NextResponse.json({
          success: false,
          error: "Gagal menambah atribut. Pastikan tabel attribute_items sudah dibuat di Supabase.",
          needsSql: true
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: "Item atribut berhasil ditambahkan!",
        item: data
      })
    }

    if (action === "delete") {
      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId wajib disertakan" }, { status: 400 })
      }

      const { error } = await supabase
        .from("attribute_items")
        .delete()
        .eq("id", itemId)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Item atribut berhasil dihapus!"
      })
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

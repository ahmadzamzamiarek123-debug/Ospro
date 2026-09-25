"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member, User } from "@/types/database"
import { AttributeItem, getRafiaForKelompok } from "@/lib/attributeDefaults"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Plus, 
  Trash2, 
  Pencil,
  SlidersHorizontal,
  Shirt,
  ShoppingBag,
  FileText,
  Copy
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import Link from "next/link"

interface AttributeCheckRecord {
  id: string
  member_id: string
  session_number: number
  status: "lengkap" | "tidak_lengkap"
  checked_items: string[]
  missing_items: string[]
  notes: string | null
  checked_by: string | null
  checked_at: string
}

export default function AttributeCheckPage() {
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

  // Data
  const [members, setMembers] = useState<Member[]>([])
  const [checks, setChecks] = useState<Record<string, AttributeCheckRecord>>({})
  const [attributeItems, setAttributeItems] = useState<AttributeItem[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<"semua" | "belum" | "lengkap" | "kurang">("semua")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Checklist Form State
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [recentCheckedMembers, setRecentCheckedMembers] = useState<Member[]>([])

  // Modal Kelola Atribut (Admin)
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false)
  const [manageSession, setManageSession] = useState<number>(1)
  const [manageItems, setManageItems] = useState<AttributeItem[]>([])
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false)
  const [newItemName, setNewItemName] = useState<string>("")
  const [newItemCategory, setNewItemCategory] = useState<"dresscode" | "atribut" | "tugas">("atribut")
  const [newItemDetail, setNewItemDetail] = useState<string>("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [needsSqlAlert, setNeedsSqlAlert] = useState<boolean>(false)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // 1. Ambil data sesi aktif terpusat & data user
  useEffect(() => {
    async function initUserAndSession() {
      const supabase = createClient()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()
          if (profile) {
            setCurrentUser(profile as User)
            if (profile.role === "admin" || profile.nim === "admin" || user.email?.startsWith("admin")) {
              setIsAdmin(true)
            }
          }
        }

        // Ambil sesi aktif terpusat
        const res = await fetch("/api/session/active")
        const json = await res.json()
        if (json.success && json.sessionNumber) {
          setSessionNumber(json.sessionNumber)
          setManageSession(json.sessionNumber)
        }
      } catch {
        // ignore
      }
    }
    initUserAndSession()
  }, [])

  // 2. Ambil data members (hanya peserta)
  const fetchMembers = useCallback(async () => {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("role", "peserta")
        .order("nim", { ascending: true })

      if (data) {
        setMembers(data as Member[])
      }
    } catch {
      // ignore
    }
  }, [])

  // 3. Ambil daftar atribut untuk sesi saat ini
  const fetchAttributeItems = useCallback(async (session: number) => {
    try {
      const res = await fetch(`/api/attributes/config?session=${session}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setAttributeItems(data.items)
      }
    } catch {
      // ignore
    }
  }, [])

  // 4. Ambil hasil rekaman pemeriksaan atribut untuk sesi ini
  const fetchChecks = useCallback(async (session: number) => {
    try {
      const res = await fetch(`/api/attributes/check?session=${session}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.checks)) {
        const checkMap: Record<string, AttributeCheckRecord> = {}
        data.checks.forEach((c: AttributeCheckRecord) => {
          checkMap[c.member_id] = c
        })
        setChecks(checkMap)
        if (data.needsSql) {
          setNeedsSqlAlert(true)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Muat data awal
  useEffect(() => {
    fetchMembers()
    fetchAttributeItems(sessionNumber)
    fetchChecks(sessionNumber)
  }, [fetchMembers, fetchAttributeItems, fetchChecks, sessionNumber])

  // Saat member dipilih, isi checklist sesuai riwayat (jika sudah dicek) atau kosongkan
  useEffect(() => {
    if (selectedMember) {
      const existing = checks[selectedMember.id]
      if (existing) {
        setCheckedItemIds(new Set(existing.checked_items || []))
        setNotes(existing.notes || "")
      } else {
        // Default baru: kosong (atau bisa klik tombol "Lengkap Semua")
        setCheckedItemIds(new Set())
        setNotes("")
      }
    }
  }, [selectedMember, checks])

  // Fokuskan kembali ke input pencarian
  const focusSearch = () => {
    setTimeout(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }, 50)
  }

  // Pilih member untuk diperiksa
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member)
  }

  // Centang semua item (Fast Track)
  const handleCheckAll = () => {
    const allIds = new Set(attributeItems.map((item) => item.id))
    setCheckedItemIds(allIds)
  }

  // Kosongkan centang
  const handleClearAll = () => {
    setCheckedItemIds(new Set())
  }

  // Toggle single item
  const handleToggleItem = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Simpan hasil pemeriksaan
  const handleSaveCheck = async () => {
    if (!selectedMember) return
    setIsSubmitting(true)

    const checkedArray = Array.from(checkedItemIds)
    const missingItems = attributeItems
      .filter((item) => !checkedItemIds.has(item.id))
      .map((item) => item.name)

    const isComplete = missingItems.length === 0
    const status: "lengkap" | "tidak_lengkap" = isComplete ? "lengkap" : "tidak_lengkap"
    const officerName = currentUser?.name || "Petugas Sekdis"

    try {
      const res = await fetch("/api/attributes/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          sessionNumber,
          status,
          checkedItems: checkedArray,
          missingItems,
          notes,
          checkedByName: officerName
        })
      })

      const data = await res.json()

      if (data.success) {
        toast.success(
          isComplete ? "Atribut Lengkap!" : `Tercatat Kurang (${missingItems.length} item)`,
          {
            description: `${selectedMember.name} (${selectedMember.nim}) • Sesi ${sessionNumber}`,
            icon: isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />
          }
        )

        // Update local state checks
        setChecks((prev) => ({
          ...prev,
          [selectedMember.id]: {
            id: data.check?.id || selectedMember.id,
            member_id: selectedMember.id,
            session_number: sessionNumber,
            status,
            checked_items: checkedArray,
            missing_items: missingItems,
            notes,
            checked_by: officerName,
            checked_at: new Date().toISOString()
          }
        }))

        // Tambah ke recent checks
        setRecentCheckedMembers((prev) => [
          selectedMember,
          ...prev.filter((m) => m.id !== selectedMember.id).slice(0, 4)
        ])

        // Bersihkan seleksi & kembali fokus ke pencarian
        setSelectedMember(null)
        setSearchQuery("")
        focusSearch()
      } else {
        if (data.needsSql) {
          setNeedsSqlAlert(true)
        }
        toast.error(data.error || "Gagal menyimpan pemeriksaan")
      }
    } catch {
      toast.error("Gagal terhubung ke server")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Keyboard shortcut: Tekan Enter saat form aktif untuk menyimpan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey || (e.target as HTMLElement).tagName !== "TEXTAREA")) {
        if (selectedMember && !isSubmitting) {
          e.preventDefault()
          handleSaveCheck()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  // Filter list peserta di panel kiri
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return members.filter((m) => {
      // Filter search
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.nim.toLowerCase().includes(q) ||
        (m.kelompok && m.kelompok.toLowerCase().includes(q))

      if (!matchesSearch) return false

      // Filter status
      const check = checks[m.id]
      if (statusFilter === "lengkap") return check?.status === "lengkap"
      if (statusFilter === "kurang") return check?.status === "tidak_lengkap"
      if (statusFilter === "belum") return !check

      return true
    })
  }, [members, searchQuery, statusFilter, checks])

  // Hitung ringkasan statistik
  const stats = useMemo(() => {
    let lengkap = 0
    let kurang = 0
    let belum = 0

    members.forEach((m) => {
      const c = checks[m.id]
      if (!c) belum++
      else if (c.status === "lengkap") lengkap++
      else kurang++
    })

    return {
      total: members.length,
      lengkap,
      kurang,
      belum
    }
  }, [members, checks])

  // ================= MODAL KELOLA ATRIBUT (SUPERADMIN) =================
  const openManageModal = async () => {
    setManageSession(sessionNumber)
    setIsManageModalOpen(true)
    try {
      const res = await fetch(`/api/attributes/config?session=${sessionNumber}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setManageItems(data.items)
      }
    } catch {
      // ignore
    }
  }

  const handleManageSessionChange = async (s: number) => {
    setManageSession(s)
    try {
      const res = await fetch(`/api/attributes/config?session=${s}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setManageItems(data.items)
      }
    } catch {
      // ignore
    }
  }

  const saveItemsToDb = async (sessionNum: number, nextItems: AttributeItem[], successMsg: string) => {
    setIsSavingConfig(true)
    try {
      const res = await fetch("/api/attributes/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_all",
          sessionNumber: sessionNum,
          items: nextItems
        })
      })
      const data = await res.json()
      if (data.success) {
        if (sessionNum === sessionNumber) {
          setAttributeItems(nextItems)
        }
        toast.success(successMsg)
      } else {
        toast.error(data.error || "Gagal menyimpan ke database")
      }
    } catch {
      toast.error("Gagal menyimpan perubahan ke server")
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Nama atribut wajib diisi")
      return
    }

    if (editingItemId) {
      const updatedList = manageItems.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              name: newItemName.trim(),
              category: newItemCategory,
              detail: newItemDetail.trim() || undefined
            }
          : item
      )
      setManageItems(updatedList)
      setEditingItemId(null)
      setNewItemName("")
      setNewItemDetail("")
      await saveItemsToDb(manageSession, updatedList, "Perubahan atribut berhasil disimpan!")
      return
    }

    const newItem: AttributeItem = {
      id: `item_${Date.now()}`,
      session_number: manageSession,
      name: newItemName.trim(),
      category: newItemCategory,
      detail: newItemDetail.trim() || undefined,
      order_index: manageItems.length + 1
    }

    const updatedList = [...manageItems, newItem]
    setManageItems(updatedList)
    setNewItemName("")
    setNewItemDetail("")
    await saveItemsToDb(manageSession, updatedList, `Atribut "${newItem.name}" berhasil ditambahkan & disimpan!`)
  }

  const handleStartEdit = (item: AttributeItem) => {
    setEditingItemId(item.id)
    setNewItemName(item.name)
    setNewItemCategory(item.category)
    setNewItemDetail(item.detail || "")
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setNewItemName("")
    setNewItemDetail("")
  }

  const handleDeleteItem = async (id: string) => {
    if (editingItemId === id) {
      handleCancelEdit()
    }
    const updatedList = manageItems.filter((item) => item.id !== id)
    setManageItems(updatedList)
    await saveItemsToDb(manageSession, updatedList, "Item atribut berhasil dihapus!")
  }

  const handleSaveAllConfig = async () => {
    setIsSavingConfig(true)
    try {
      const res = await fetch("/api/attributes/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_all",
          sessionNumber: manageSession,
          items: manageItems
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || "Pengaturan atribut berhasil disimpan!")
        if (manageSession === sessionNumber) {
          setAttributeItems(manageItems)
        }
        setIsManageModalOpen(false)
      } else {
        if (data.needsSql) setNeedsSqlAlert(true)
        toast.error(data.error || "Gagal menyimpan konfigurasi")
      }
    } catch {
      toast.error("Gagal terhubung ke server")
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!confirm(`Kembalikan daftar atribut Sesi ${manageSession} ke standar handbook?`)) return
    setIsSavingConfig(true)
    try {
      const res = await fetch("/api/attributes/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          sessionNumber: manageSession
        })
      })
      const data = await res.json()
      if (data.success && data.items) {
        setManageItems(data.items)
        if (manageSession === sessionNumber) {
          setAttributeItems(data.items)
        }
        toast.success(data.message)
      } else {
        if (data.needsSql) setNeedsSqlAlert(true)
        toast.error(data.error || "Gagal mereset")
      }
    } catch {
      toast.error("Gagal terhubung ke server")
    } finally {
      setIsSavingConfig(false)
    }
  }

  // Kelompokkan item berdasarkan kategori
  const groupedItems = useMemo(() => {
    const dresscode = attributeItems.filter((i) => i.category === "dresscode")
    const atribut = attributeItems.filter((i) => i.category === "atribut")
    const tugas = attributeItems.filter((i) => i.category === "tugas")
    return { dresscode, atribut, tugas }
  }, [attributeItems])

  // Kelompokkan item di modal kelola atribut (Superadmin)
  const manageGrouped = useMemo(() => {
    const dresscode = manageItems.filter((i) => i.category === "dresscode")
    const atribut = manageItems.filter((i) => i.category === "atribut")
    const tugas = manageItems.filter((i) => i.category === "tugas")
    return { dresscode, atribut, tugas }
  }, [manageItems])

  // Centang per kategori (Dresscode sendiri, Atribut sendiri, Tugas sendiri)
  const handleCheckCategory = (category: "dresscode" | "atribut" | "tugas") => {
    const categoryItemIds = groupedItems[category].map((item) => item.id)
    if (categoryItemIds.length === 0) return
    setCheckedItemIds((prev) => {
      const next = new Set(prev)
      const allCategoryChecked = categoryItemIds.every((id) => next.has(id))
      
      if (allCategoryChecked) {
        // Jika sudah lengkap, batalkan centang kategori ini
        categoryItemIds.forEach((id) => next.delete(id))
      } else {
        // Jika belum lengkap, centang semua item di kategori ini
        categoryItemIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const dresscodeCount = groupedItems.dresscode.filter((i) => checkedItemIds.has(i.id)).length
  const isDresscodeComplete = groupedItems.dresscode.length > 0 && dresscodeCount === groupedItems.dresscode.length

  const atributCount = groupedItems.atribut.filter((i) => checkedItemIds.has(i.id)).length
  const isAtributComplete = groupedItems.atribut.length > 0 && atributCount === groupedItems.atribut.length

  const tugasCount = groupedItems.tugas.filter((i) => checkedItemIds.has(i.id)).length
  const isTugasComplete = groupedItems.tugas.length > 0 && tugasCount === groupedItems.tugas.length

  // Hitung jumlah item terpilih
  const totalItemCount = attributeItems.length
  const checkedCount = attributeItems.filter((i) => checkedItemIds.has(i.id)).length
  const isAllChecked = totalItemCount > 0 && checkedCount === totalItemCount
  const rafiaInfo = getRafiaForKelompok(selectedMember?.kelompok)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Header Minimalis */}
      <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-1.5">
              <img src="/logo.png" alt="OSI" className="h-6 w-6 object-contain" />
              <span className="text-sm font-black tracking-tight text-slate-900">OSI 2026</span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-700">Meja Sekdis (Cek Atribut)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sesi Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setSessionNumber(num)
                    setSelectedMember(null)
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    sessionNumber === num
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sessionNumber === num ? "bg-emerald-500 animate-pulse" : "bg-transparent"}`} />
                  <span>Sesi {num}</span>
                </button>
              ))}
            </div>

            {/* Tombol Kelola Atribut (Admin) */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={openManageModal}
                className="h-8 px-2.5 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold gap-1 shadow-2xs"
                title="Kelola Daftar Atribut"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kelola Atribut</span>
              </Button>
            )}

            {/* Tombol Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                fetchMembers()
                fetchAttributeItems(sessionNumber)
                fetchChecks(sessionNumber)
                toast.info("Data diperbarui")
              }}
              className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900"
              title="Segarkan Data"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Alert jika SQL Supabase belum dijalankan */}
      {needsSqlAlert && (
        <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Skrip database untuk atribut belum dijalankan di Supabase. Sistem saat ini berjalan dengan penyimpanan lokal/default.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`-- 1. TABEL ATTRIBUTE_ITEMS
CREATE TABLE IF NOT EXISTS public.attribute_items (
  id TEXT PRIMARY KEY,
  session_number INT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dresscode', 'atribut', 'tugas')),
  detail TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABEL ATTRIBUTE_CHECKS
CREATE TABLE IF NOT EXISTS public.attribute_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  session_number INT NOT NULL,
  status TEXT CHECK (status IN ('lengkap', 'tidak_lengkap')) NOT NULL DEFAULT 'lengkap',
  checked_items TEXT[] DEFAULT '{}',
  missing_items TEXT[] DEFAULT '{}',
  notes TEXT,
  checked_by TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (member_id, session_number)
);

-- 3. RLS & POLICIES
ALTER TABLE public.attribute_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_checks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribute_items' AND policyname = 'Allow all for attribute_items') THEN
    CREATE POLICY "Allow all for attribute_items" ON public.attribute_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribute_checks' AND policyname = 'Allow all for attribute_checks') THEN
    CREATE POLICY "Allow all for attribute_checks" ON public.attribute_checks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. SEED DATA DEFAULT (DAY 1-3)
INSERT INTO public.attribute_items (id, session_number, name, category, detail, order_index) VALUES
  ('d1_kemeja', 1, 'Kemeja putih', 'dresscode', 'Lengan panjang rapi', 1),
  ('d1_celana', 1, 'Celana kain hitam', 'dresscode', 'Standar non-jeans', 2),
  ('d1_pantofel', 1, 'Sepatu pantofel', 'dresscode', 'Pantofel formal', 3),
  ('d1_kaoskaki', 1, 'Kaos kaki putih', 'dresscode', 'Warna putih polos', 4),
  ('d1_ikatpinggang', 1, 'Ikat pinggang warna hitam', 'dresscode', 'Standar formal', 5),
  ('d1_hijab', 1, 'Hijab hitam segi empat paris', 'dresscode', 'No rawis (khusus mahasiswi)', 6),
  ('d1_nametag', 1, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d1_bulu', 1, 'Bulu Ayam satu helai warna putih', 'atribut', '1 helai bersih', 8),
  ('d1_tumbler', 1, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d1_konsumsi', 1, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d1_snack', 1, '3pcs Snack berwarna HIJAU', 'atribut', 'Kemasan dominan hijau', 11),
  ('d1_tugas_logo', 1, 'Gambar Logo HIMASI (kertas A4)', 'tugas', 'Tulis tangan manual, dilarang jiplak', 12),
  ('d2_batik', 2, 'Baju Batik', 'dresscode', 'Batik sopan & rapi', 1),
  ('d2_celana', 2, 'Celana kain hitam', 'dresscode', 'Standar non-jeans', 2),
  ('d2_pantofel', 2, 'Sepatu pantofel', 'dresscode', 'Pantofel formal', 3),
  ('d2_kaoskaki', 2, 'Kaos kaki Kanan PUTIH, Kiri HITAM', 'dresscode', 'Kanan putih, kiri hitam', 4),
  ('d2_rafia', 2, 'Tali rafia warna kelompok (ikat pinggang)', 'dresscode', 'Dijadikan ikat pinggang sesuai warna kelompok', 5),
  ('d2_hijab', 2, 'Hijab hitam', 'dresscode', 'Khusus mahasiswi', 6),
  ('d2_nametag', 2, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d2_bulu', 2, 'Bulu Ayam dari DAY 1', 'atribut', 'Lanjutan dari hari pertama', 8),
  ('d2_tumbler', 2, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d2_konsumsi', 2, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d2_snack', 2, '3pcs Snack berwarna PUTIH', 'atribut', 'Kemasan dominan putih', 11),
  ('d2_tugas_aboutme', 2, 'Tugas About Me (Folio)', 'tugas', 'Rangkuman 5 teman + foto bersama di Folio', 12),
  ('d2_tugas_materi', 2, 'Rangkuman Materi 1 & Materi 2', 'tugas', 'Ditulis tangan rapi', 13),
  ('d3_kaos', 3, 'Kaos putih lengan panjang', 'dresscode', 'Kaos sopan lengan panjang', 1),
  ('d3_training', 3, 'Celana training hitam', 'dresscode', 'Tidak boleh ketat', 2),
  ('d3_sepatu', 3, 'Sepatu Sport (bebas warna)', 'dresscode', 'Sepatu olahraga', 3),
  ('d3_topi', 3, 'Topi hitam polos', 'dresscode', 'Polos tanpa logo mencolok', 4),
  ('d3_rafia', 3, 'Tali rafia warna kelompok (panjang 1 meter)', 'dresscode', 'Panjang 1 meter sesuai warna kelompok', 5),
  ('d3_hijab', 3, 'Hijab sport hitam', 'dresscode', 'Khusus mahasiswi', 6),
  ('d3_nametag', 3, 'Nametag bekas PKKMB USG 2026', 'atribut', 'Wajib dipakai/dibawa', 7),
  ('d3_bulu', 3, 'Bulu Ayam dari DAY 2', 'atribut', 'Lanjutan dari hari sebelumnya', 8),
  ('d3_tumbler', 3, 'Tumbler berisi air mineral full', 'atribut', 'Berisi penuh', 9),
  ('d3_konsumsi', 3, '1pcs Roti + 1pcs Susu Ultra Milk 200ml', 'atribut', 'Susu rasa bebas', 10),
  ('d3_snack', 3, '5pcs Jajanan Tradisional (bebas)', 'atribut', 'Jajanan pasar / tradisional', 11),
  ('d3_tugas_materi', 3, 'Rangkuman Materi 3 & Materi 4', 'tugas', 'Ditulis tangan rapi', 12)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  detail = EXCLUDED.detail,
  order_index = EXCLUDED.order_index;`)
                toast.success("Skrip SQL lengkap berhasil disalin! Silakan paste di Supabase SQL Editor.")
              }}
              className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[11px] shrink-0 inline-flex items-center gap-1 shadow-2xs"
            >
              <Copy className="h-3 w-3" /> Salin SQL
            </button>
            <a
              href="https://supabase.com/dashboard/project/gxurepfvxoijonntbcga/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-[11px] shrink-0 inline-flex items-center gap-1 shadow-2xs"
            >
              Buka Supabase SQL Editor ↗
            </a>
          </div>
        </div>
      )}

      {/* Main Dual-Panel Content */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================= PANEL KIRI (PENCARIAN & DAFTAR MABA) ================= */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Card Pencarian */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
            {/* Input Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Ketik NIM atau Nama maba..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-9 pr-8 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus-visible:ring-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    focusSearch()
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills & Mini Stats */}
            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                {(["semua", "belum", "lengkap", "kurang"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-0.5 rounded-md transition-all uppercase tracking-wider text-[10px] ${
                      statusFilter === f
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                <span className="text-emerald-600 font-bold">{stats.lengkap} Lengkap</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">{stats.kurang} Kurang</span>
                <span>•</span>
                <span>{stats.belum} Belum</span>
              </div>
            </div>
          </div>

          {/* List Peserta */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-2xs flex-1 min-h-[350px] max-h-[580px] overflow-y-auto space-y-1.5">
            {filteredMembers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-1">
                <Search className="h-6 w-6 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">Tidak ada peserta ditemukan</p>
                <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau filter.</p>
              </div>
            ) : (
              filteredMembers.map((m) => {
                const check = checks[m.id]
                const isSelected = selectedMember?.id === m.id

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMember(m)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : check?.status === "lengkap"
                        ? "bg-emerald-50/50 hover:bg-emerald-50/80 border-emerald-100 text-slate-800"
                        : check?.status === "tidak_lengkap"
                        ? "bg-amber-50/50 hover:bg-amber-50/80 border-amber-100 text-slate-800"
                        : "bg-white hover:bg-slate-50 border-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="overflow-hidden space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">{m.name}</span>
                        {m.kelompok && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                              isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {m.kelompok}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {m.nim}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {check ? (
                        check.status === "lengkap" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                            <Check className="h-3 w-3 stroke-[3]" /> Lengkap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-2xs">
                            <AlertTriangle className="h-3 w-3" /> Kurang {check.missing_items?.length || 1}
                          </span>
                        )
                      ) : (
                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${
                            isSelected ? "text-slate-400" : "text-slate-400 bg-slate-50 border border-slate-100"
                          }`}
                        >
                          Belum
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 5 Maba Terakhir Diperiksa (Recent Checks) */}
          {recentCheckedMembers.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs space-y-1.5">
              <span className="text-[10px] font-bold font-mono uppercase text-slate-400 block px-1">
                Baru Saja Diperiksa:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentCheckedMembers.map((rm) => (
                  <button
                    key={rm.id}
                    onClick={() => handleSelectMember(rm)}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span>{rm.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({rm.nim})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= PANEL KANAN (FORM CHECKLIST ATRIBUT) ================= */}
        <div className="lg:col-span-7 flex flex-col">
          {!selectedMember ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 shadow-2xs flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Shirt className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-black text-slate-900">Belum Ada Peserta Dipilih</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ketik NIM atau nama peserta pada kolom pencarian di sebelah kiri untuk membuka checklist atribut.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex-1 flex flex-col justify-between space-y-4 animate-in fade-in duration-150">
              {/* Header Peserta Terpilih */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                        {selectedMember.name}
                      </h2>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {selectedMember.nim}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedMember.kelompok || "Tanpa Kelompok"} • Sesi {sessionNumber}
                    </p>
                  </div>

                  {/* Riwayat status jika sudah dicek sebelumnya */}
                  {checks[selectedMember.id] && (
                    <div className="text-right font-mono text-[10px]">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          checks[selectedMember.id].status === "lengkap"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {checks[selectedMember.id].status === "lengkap" ? "Sudah Lengkap" : "Sudah Dicek (Kurang)"}
                      </span>
                      <p className="text-slate-400 mt-0.5">
                        Oleh: {checks[selectedMember.id].checked_by || "Sekdis"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Petunjuk Khusus Warna Tali Rafia untuk Sesi 2 & 3 */}
                {(sessionNumber === 2 || sessionNumber === 3) && rafiaInfo && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${rafiaInfo.bgClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-slate-500">Ketentuan Tali Rafia:</span>
                      <span className={rafiaInfo.textClass}>{rafiaInfo.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-normal">
                      {sessionNumber === 2 ? "(Sabuk Ikat Pinggang)" : "(Panjang 1 Meter)"}
                    </span>
                  </div>
                )}

                {/* Fast Track Buttons Per Kategori & Counter */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Tombol Kategori: Dresscode */}
                    {groupedItems.dresscode.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("dresscode")}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border shadow-2xs ${
                          isDresscodeComplete
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                        title="Klik untuk centang/batalkan semua Dresscode"
                      >
                        <Shirt className="h-3 w-3" />
                        <span>{isDresscodeComplete ? "Dresscode ✓" : "Lengkap Dresscode"}</span>
                      </button>
                    )}

                    {/* Tombol Kategori: Atribut */}
                    {groupedItems.atribut.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("atribut")}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border shadow-2xs ${
                          isAtributComplete
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                        title="Klik untuk centang/batalkan semua Atribut"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>{isAtributComplete ? "Atribut ✓" : "Lengkap Atribut"}</span>
                      </button>
                    )}

                    {/* Tombol Kategori: Tugas */}
                    {groupedItems.tugas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("tugas")}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border shadow-2xs ${
                          isTugasComplete
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                        title="Klik untuk centang/batalkan semua Tugas"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{isTugasComplete ? "Tugas ✓" : "Lengkap Tugas"}</span>
                      </button>
                    )}

                    {/* Master Centang Semua */}
                    <button
                      type="button"
                      onClick={handleCheckAll}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Centang semua item sekaligus"
                    >
                      Semua
                    </button>

                    {/* Kosongkan */}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="h-7 px-2 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
                      title="Kosongkan centang"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Progress Counter */}
                  <div className="text-right font-mono">
                    <span className={`text-xs font-bold ${isAllChecked ? "text-emerald-600" : "text-slate-600"}`}>
                      {checkedCount} / {totalItemCount} Item
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({isAllChecked ? "Lengkap" : `Kurang ${totalItemCount - checkedCount}`})
                    </span>
                  </div>
                </div>
              </div>

              {/* Daftar Checklist Grouped */}
              <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1">
                {/* 1. Dresscode */}
                {groupedItems.dresscode.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs pb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider">
                        <Shirt className="h-3.5 w-3.5 text-slate-500" />
                        <span>Dresscode & Pakaian</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          ({dresscodeCount}/{groupedItems.dresscode.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("dresscode")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                          isDresscodeComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>{isDresscodeComplete ? "Batal" : "Centang Dresscode"}</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {groupedItems.dresscode.map((item) => {
                        const isChecked = checkedItemIds.has(item.id)
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleItem(item.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                              isChecked
                                ? "bg-emerald-50/70 border-emerald-200 text-slate-900"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <span className="text-xs font-semibold leading-snug break-words block">{item.name}</span>
                                {item.detail && (
                                  <span className="text-[11px] text-slate-500 font-normal leading-tight break-words block">
                                    {item.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Atribut Bawaan */}
                {groupedItems.atribut.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs pb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider">
                        <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
                        <span>Atribut Bawaan & Konsumsi</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          ({atributCount}/{groupedItems.atribut.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("atribut")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                          isAtributComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>{isAtributComplete ? "Batal" : "Centang Atribut"}</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {groupedItems.atribut.map((item) => {
                        const isChecked = checkedItemIds.has(item.id)
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleItem(item.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                              isChecked
                                ? "bg-emerald-50/70 border-emerald-200 text-slate-900"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <span className="text-xs font-semibold leading-snug break-words block">{item.name}</span>
                                {item.detail && (
                                  <span className="text-[11px] text-slate-500 font-normal leading-tight break-words block">
                                    {item.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Tugas Fisik */}
                {groupedItems.tugas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs pb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider">
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>Penugasan Fisik (Dikumpulkan)</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          ({tugasCount}/{groupedItems.tugas.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCheckCategory("tugas")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                          isTugasComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>{isTugasComplete ? "Batal" : "Centang Tugas"}</span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {groupedItems.tugas.map((item) => {
                        const isChecked = checkedItemIds.has(item.id)
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleItem(item.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                              isChecked
                                ? "bg-emerald-50/70 border-emerald-200 text-slate-900"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <span className="text-xs font-semibold leading-snug break-words block">{item.name}</span>
                                {item.detail && (
                                  <span className="text-[11px] text-slate-500 font-normal leading-tight break-words block">
                                    {item.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions: Catatan, Opsi Komdis & Tombol Simpan */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {/* Catatan Petugas */}
                <div className="space-y-1">
                  <Input
                    placeholder="Catatan tambahan (opsional: misal barang disita atau izin khusus)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                {/* Primary Submit Button */}
                <Button
                  onClick={handleSaveCheck}
                  disabled={isSubmitting}
                  className={`w-full h-12 rounded-xl font-black text-sm tracking-wide shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
                    isAllChecked
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-900 hover:bg-black text-white"
                  }`}
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>
                    {isSubmitting
                      ? "Menyimpan Pemeriksaan..."
                      : isAllChecked
                      ? "Simpan Pemeriksaan (Lengkap)"
                      : `Simpan Pemeriksaan (Kurang ${totalItemCount - checkedCount} Item)`}
                  </span>
                  <span className="text-[11px] font-mono font-normal opacity-75 hidden sm:inline">[Tekan Enter]</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= MODAL KELOLA ATRIBUT (KHUSUS SUPERADMIN) ================= */}
      <Dialog open={isManageModalOpen} onOpenChange={(open) => {
        setIsManageModalOpen(open)
        if (!open) handleCancelEdit()
      }}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-white overflow-hidden shadow-2xl gap-0">
          <DialogHeader className="shrink-0 pb-3 pr-8 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-slate-700 shrink-0" />
                  <span>Kelola Daftar Atribut (Superadmin)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Ubah, tambah, atau hapus daftar atribut peserta per hari. Klik &ldquo;Simpan Perubahan Atribut&rdquo; di bagian bawah setelah selesai.
                </DialogDescription>
              </div>

              {/* Day Switcher */}
              <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-xl shrink-0">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      handleCancelEdit()
                      handleManageSessionChange(num)
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      manageSession === num
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Day {num}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Form Tambah / Edit Atribut */}
          <div className="shrink-0 pt-3">
            <div
              className={`rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all border ${
                editingItemId
                  ? "bg-amber-50/70 border-amber-300"
                  : "bg-slate-50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  {editingItemId ? (
                    <>
                      <Pencil className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-900">Mode Edit Atribut (Day {manageSession})</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span className="text-slate-700 uppercase tracking-wider font-mono text-[11px]">
                        Tambah Item Atribut Baru (Day {manageSession})
                      </span>
                    </>
                  )}
                </span>
                {editingItemId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-5">
                  <Input
                    placeholder="Nama item (contoh: Notebook, Susu Ultra Milk)..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="h-10 bg-white text-xs sm:text-sm rounded-xl border-slate-200"
                  />
                </div>
                <div className="md:col-span-4">
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as "dresscode" | "atribut" | "tugas")}
                    className="w-full h-10 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold px-3 text-slate-700"
                  >
                    <option value="dresscode">👔 Dresscode & Pakaian</option>
                    <option value="atribut">🎒 Atribut & Bawaan</option>
                    <option value="tugas">📝 Penugasan Fisik (Dikumpulkan)</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    className={`w-full h-10 text-xs sm:text-sm font-bold rounded-xl gap-1.5 shadow-2xs ${
                      editingItemId
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-slate-900 hover:bg-black text-white"
                    }`}
                  >
                    {editingItemId ? (
                      <>
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Simpan Edit</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 shrink-0" />
                        <span>Tambah ke Daftar</span>
                      </>
                    )}
                  </Button>
                  {editingItemId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="h-10 px-3 rounded-xl text-xs font-bold border-slate-200 shrink-0"
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </div>

              <Input
                placeholder="Spesifikasi / keterangan opsional (contoh: Buku catatan materi, ukuran 200ml bebas rasa, ditulis tangan di kertas folio)..."
                value={newItemDetail}
                onChange={(e) => setNewItemDetail(e.target.value)}
                className="h-9 bg-white text-xs rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* List Card Atribut yang sudah ada (Grouped & Lega) */}
          <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-5 min-h-[240px]">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-mono font-bold text-slate-700">
                Daftar Item Day {manageSession} ({manageItems.length} Total Item)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToDefault}
                disabled={isSavingConfig}
                className="text-xs font-bold text-slate-400 hover:text-red-600 h-7 px-2.5"
              >
                Reset Default Handbook
              </Button>
            </div>

            {manageItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <p className="text-sm font-bold text-slate-600">Belum ada item untuk Day {manageSession}</p>
                <p className="text-xs text-slate-400">Gunakan formulir di atas atau klik Reset Default Handbook.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. Dresscode Group */}
                {manageGrouped.dresscode.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Shirt className="h-4 w-4 text-sky-600 shrink-0" />
                      <span>Dresscode & Pakaian</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">
                        ({manageGrouped.dresscode.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {manageGrouped.dresscode.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            editingItemId === item.id
                              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                              : "bg-white hover:border-slate-300 border-slate-200/80 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                    editingItemId === item.id
                                      ? "bg-amber-600 text-white"
                                      : "text-slate-500 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200/60"
                                  }`}
                                  title="Edit item ini"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                  title="Hapus item ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {item.detail ? (
                              <p className="text-xs text-slate-600 font-normal leading-relaxed bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mr-1">Ket:</span>
                                {item.detail}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic block">Tanpa catatan tambahan</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Atribut Group */}
                {manageGrouped.atribut.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <ShoppingBag className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Atribut Bawaan & Konsumsi</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">
                        ({manageGrouped.atribut.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {manageGrouped.atribut.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            editingItemId === item.id
                              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                              : "bg-white hover:border-slate-300 border-slate-200/80 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                    editingItemId === item.id
                                      ? "bg-amber-600 text-white"
                                      : "text-slate-500 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200/60"
                                  }`}
                                  title="Edit item ini"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                  title="Hapus item ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {item.detail ? (
                              <p className="text-xs text-slate-600 font-normal leading-relaxed bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mr-1">Ket:</span>
                                {item.detail}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic block">Tanpa catatan tambahan</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Tugas Group */}
                {manageGrouped.tugas.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <FileText className="h-4 w-4 text-violet-600 shrink-0" />
                      <span>Penugasan Fisik (Dikumpulkan)</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">
                        ({manageGrouped.tugas.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {manageGrouped.tugas.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            editingItemId === item.id
                              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                              : "bg-white hover:border-slate-300 border-slate-200/80 shadow-2xs"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                    editingItemId === item.id
                                      ? "bg-amber-600 text-white"
                                      : "text-slate-500 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200/60"
                                  }`}
                                  title="Edit item ini"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                  title="Hapus item ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {item.detail ? (
                              <p className="text-xs text-slate-600 font-normal leading-relaxed bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mr-1">Ket:</span>
                                {item.detail}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic block">Tanpa catatan tambahan</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Simpan Perubahan Modal (Footer Pinned) */}
          <div className="shrink-0 pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
            <span className="text-xs font-mono text-slate-500 hidden sm:inline">
              Day {manageSession} • {manageItems.length} Item Terdaftar
            </span>
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  handleCancelEdit()
                  setIsManageModalOpen(false)
                }}
                className="rounded-xl text-xs sm:text-sm font-bold border-slate-200 h-10 px-4"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveAllConfig}
                disabled={isSavingConfig}
                className="rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-black h-10 px-5 shadow-2xs"
              >
                {isSavingConfig ? "Menyimpan..." : "Simpan Perubahan Atribut"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

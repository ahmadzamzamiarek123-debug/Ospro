"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Search, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Check, 
  Clock, 
  Users, 
  UserCheck, 
  UserX,
  AlertTriangle,
  QrCode,
  X,
  ShieldAlert
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SlotAttendance {
  isAttended: boolean
  scannedAt: string | null
  status: string | null
  method: string | null
}

interface MemberAttendance {
  id: string
  nim: string
  name: string
  role?: string
  kelompok: string
  isAttended: boolean
  attendanceStatus: string | null
  method: string | null
  scannedAt: string | null
  awal: SlotAttendance
  akhir: SlotAttendance
  kehadiranState: "lengkap" | "hanya_awal" | "hanya_akhir" | "alpha"
}

export default function PresensiLayarPage() {
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")

  // Data Kehadiran
  const [members, setMembers] = useState<MemberAttendance[]>([])
  const [totalPeserta, setTotalPeserta] = useState(0)
  const [totalAwal, setTotalAwal] = useState(0)
  const [totalAkhir, setTotalAkhir] = useState(0)
  const [totalLengkap, setTotalLengkap] = useState(0)
  const [totalHanyaAwal, setTotalHanyaAwal] = useState(0)
  const [totalBelumHadir, setTotalBelumHadir] = useState(0)
  const [totalSemua, setTotalSemua] = useState(0)

  // Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"semua" | "lengkap" | "hanya_awal" | "belum">("semua")
  const [roleFilter, setRoleFilter] = useState<"semua" | "peserta" | "panitia">("semua")
  const [kelompokFilter, setKelompokFilter] = useState<string>("semua")

  // Modal Manual Absen
  const [selectedMemberForManual, setSelectedMemberForManual] = useState<MemberAttendance | null>(null)
  const [manualSlot, setManualSlot] = useState<"awal" | "akhir" | "both">("awal")
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false)

  // Polling & Realtime Data Kehadiran
  const fetchAttendanceList = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/attendance/list?session=${sessionNumber}`)
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        setTotalPeserta(data.totalPeserta || 0)
        setTotalAwal(data.totalAwal || 0)
        setTotalAkhir(data.totalAkhir || 0)
        setTotalLengkap(data.totalLengkap || 0)
        setTotalHanyaAwal(data.totalHanyaAwal || 0)
        setTotalBelumHadir(data.totalBelumHadir || 0)
        setTotalSemua(data.totalSemua || 0)
        setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      }
    } catch {
      // Abaikan error background polling
    } finally {
      if (!isSilent) setIsRefreshing(false)
    }
  }, [sessionNumber])

  // Initial Fetch & 3-Second Polling
  useEffect(() => {
    fetchAttendanceList()
    const interval = setInterval(() => {
      fetchAttendanceList(true)
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchAttendanceList])

  // Supabase Realtime WebSocket Connection
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-attendance-${sessionNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          fetchAttendanceList(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionNumber, fetchAttendanceList])

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Absenkan Manual langsung dari Laptop
  const handleSaveManual = async () => {
    if (!selectedMemberForManual) return
    setIsSubmittingManual(true)
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberForManual.id,
          sessionNumber,
          slot: manualSlot,
          status: "hadir"
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Presensi manual ${selectedMemberForManual.name} berhasil disimpan!`)
        setSelectedMemberForManual(null)
        fetchAttendanceList()
      } else {
        toast.error(data.error || "Gagal menyimpan presensi manual")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setIsSubmittingManual(false)
    }
  }

  // Helper Format Waktu
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-"
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }) + " WIB"
    } catch {
      return "-"
    }
  }

  // Helper Cek apakah baru hadir (< 2 menit lalu)
  const isRecentScan = (isoString: string | null) => {
    if (!isoString) return false
    try {
      const diff = Date.now() - new Date(isoString).getTime()
      return diff >= 0 && diff < 120000 // 2 menit
    } catch {
      return false
    }
  }

  // Filter Data
  const filteredMembers = members
    .filter((m) => {
      const query = searchQuery.toLowerCase().trim()
      const matchSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.nim.toLowerCase().includes(query) ||
        m.kelompok.toLowerCase().includes(query)

      if (!matchSearch) return false
      if (roleFilter !== "semua" && m.role !== roleFilter) return false
      if (kelompokFilter !== "semua" && m.kelompok !== kelompokFilter) return false

      if (statusFilter === "lengkap") return m.kehadiranState === "lengkap"
      if (statusFilter === "hanya_awal") return m.kehadiranState === "hanya_awal"
      if (statusFilter === "belum") return m.kehadiranState === "alpha"
      return true
    })
    .sort((a, b) => {
      // Prioritaskan yang hanya_awal jika sedang di filter waspada
      if (statusFilter === "hanya_awal") {
        return a.name.localeCompare(b.name)
      }
      // Default: Urutkan yang terbaru scan di atas
      const timeA = Math.max(
        a.akhir?.scannedAt ? new Date(a.akhir.scannedAt).getTime() : 0,
        a.awal?.scannedAt ? new Date(a.awal.scannedAt).getTime() : 0
      )
      const timeB = Math.max(
        b.akhir?.scannedAt ? new Date(b.akhir.scannedAt).getTime() : 0,
        b.awal?.scannedAt ? new Date(b.awal.scannedAt).getTime() : 0
      )
      if (timeA !== timeB) return timeB - timeA
      return a.name.localeCompare(b.name)
    })

  // List Kelompok Unik untuk Dropdown
  const uniqueKelompok = Array.from(
    new Set(members.filter((m) => m.role === "peserta").map((m) => m.kelompok))
  ).filter(Boolean).sort()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          {/* Logo & Judul */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="OSI" className="h-7 w-7 object-contain" />
              <span className="text-base font-black tracking-tight text-slate-900">OSI 2026</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Monitor Presensi Sesi</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
          </div>

          {/* Sesi Selector & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pilihan Sesi (3 Sesi) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {[
                { num: 1, date: "23 Sep" },
                { num: 2, date: "24 Sep" },
                { num: 3, date: "25 Sep" }
              ].map((s) => (
                <button
                  key={s.num}
                  onClick={() => setSessionNumber(s.num)}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    sessionNumber === s.num
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Sesi {s.num}</span>
                  <span className="text-[10px] font-mono text-slate-400 hidden md:inline">({s.date})</span>
                </button>
              ))}
            </div>

            {/* Tombol Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAttendanceList(false)}
              disabled={isRefreshing}
              className="h-9 px-3 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5 shadow-2xs"
              title="Segarkan data sekarang"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-slate-900" : "text-slate-500"}`} />
              <span className="hidden md:inline">Segarkan</span>
            </Button>

            {/* Tombol Fullscreen */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 px-3 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5 shadow-2xs"
              title="Mode Layar Penuh"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? "Keluar" : "Fullscreen"}</span>
            </Button>

            {/* Link HP Scanner */}
            <Link href="/presensi/scanner">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-3 rounded-xl border-slate-200 bg-slate-900 text-white hover:bg-black text-xs font-semibold gap-1.5 shadow-2xs"
                title="Buka Kamera Scanner"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span className="hidden md:inline">HP Scanner</span>
              </Button>
            </Link>

            {/* Kembali ke Dashboard */}
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-2 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Ringkasan Statistik 2 Fase Presensi */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Presensi Awal */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">1. Presensi Awal</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {totalAwal}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {totalPeserta}</span>
              </span>
              <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                {totalPeserta > 0 ? Math.round((totalAwal / totalPeserta) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Kedatangan awal sesi</p>
          </Card>

          {/* Card 2: Presensi Akhir */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">2. Presensi Akhir</span>
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {totalAkhir}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {totalPeserta}</span>
              </span>
              <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
                {totalPeserta > 0 ? Math.round((totalAkhir / totalPeserta) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Kepulangan / akhir sesi</p>
          </Card>

          {/* Card 3: Kehadiran Lengkap */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Hadir Lengkap</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {totalLengkap}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {totalPeserta}</span>
              </span>
              <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                {totalPeserta > 0 ? Math.round((totalLengkap / totalPeserta) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Hadir di kedua fase</p>
          </Card>

          {/* Card 4: Waspada - Belum Presensi Akhir */}
          <Card className={`border shadow-xs rounded-2xl p-4 space-y-1.5 transition-all ${
            totalHanyaAwal > 0 
              ? "bg-amber-50/70 border-amber-300" 
              : "bg-white border-slate-200/80"
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold uppercase tracking-wider text-[10px] ${
                totalHanyaAwal > 0 ? "text-amber-800" : "text-slate-500"
              }`}>
                Belum Presensi Akhir
              </span>
              {totalHanyaAwal > 0 ? (
                <ShieldAlert className="h-4 w-4 text-amber-600 animate-bounce" />
              ) : (
                <Check className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                totalHanyaAwal > 0 ? "text-amber-900" : "text-slate-800"
              }`}>
                {totalHanyaAwal}
                <span className="text-xs font-normal text-slate-400 ml-1">Peserta</span>
              </span>
              {totalHanyaAwal > 0 ? (
                <span className="text-xs font-bold font-mono text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg">
                  Pantau
                </span>
              ) : (
                <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  Aman
                </span>
              )}
            </div>
            <p className={`text-[11px] ${totalHanyaAwal > 0 ? "text-amber-800 font-medium" : "text-slate-400"}`}>
              {totalHanyaAwal > 0 ? "Hadir awal tapi belum absen akhir" : "Semua yang datang sudah absen akhir"}
            </p>
          </Card>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama peserta, NIM, atau kelompok..."
                className="pl-10 h-10 bg-slate-50/70 border-slate-200 rounded-xl text-xs font-medium focus-visible:ring-slate-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Status Presensi */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setStatusFilter("semua")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  statusFilter === "semua"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({totalSemua})
              </button>

              <button
                onClick={() => setStatusFilter("lengkap")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === "lengkap"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                Lengkap ({totalLengkap})
              </button>

              <button
                onClick={() => setStatusFilter("hanya_awal")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === "hanya_awal"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Belum Akhir ({totalHanyaAwal})
              </button>

              <button
                onClick={() => setStatusFilter("belum")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === "belum"
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
                }`}
              >
                <UserX className="h-3.5 w-3.5" />
                Alpha ({totalBelumHadir})
              </button>
            </div>
          </div>

          {/* Sub-Filter: Role & Kelompok */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            {/* Filter Role */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-semibold text-[11px] mr-1">Kategori:</span>
              <button
                onClick={() => setRoleFilter("semua")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  roleFilter === "semua" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setRoleFilter("peserta")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  roleFilter === "peserta" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Peserta ({totalPeserta})
              </button>
              <button
                onClick={() => setRoleFilter("panitia")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  roleFilter === "panitia" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Panitia ({totalSemua - totalPeserta})
              </button>
            </div>

            {/* Filter Kelompok */}
            {uniqueKelompok.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Kelompok:</span>
                <select
                  value={kelompokFilter}
                  onChange={(e) => setKelompokFilter(e.target.value)}
                  className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="semua">Semua Kelompok</option>
                  {uniqueKelompok.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tabel Daftar Hadir Live */}
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Daftar Kehadiran Sesi {sessionNumber}</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  (Menampilkan {filteredMembers.length} data)
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Menampilkan waktu scan Presensi Awal & Presensi Akhir secara berdampingan.
              </p>
            </div>

            {/* Petunjuk Live */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Sinkron: {lastSyncTime || "Baru saja"}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Mahasiswa / Panitia</th>
                  <th className="py-3 px-4">Kelompok</th>
                  <th className="py-3 px-4">1. Presensi Awal</th>
                  <th className="py-3 px-4">2. Presensi Akhir</th>
                  <th className="py-3 px-4">Status Rekap</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada data peserta yang cocok dengan filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m, idx) => {
                    const isNewAwal = isRecentScan(m.awal?.scannedAt)
                    const isNewAkhir = isRecentScan(m.akhir?.scannedAt)

                    return (
                      <tr 
                        key={m.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          m.kehadiranState === "hanya_awal" ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Nama & NIM */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-sm block">{m.name}</span>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                              <span>{m.nim}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {m.role === "panitia" ? "Panitia" : "Peserta"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kelompok */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px]">
                            {m.kelompok}
                          </span>
                        </td>

                        {/* 1. Presensi Awal */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {m.awal?.isAttended ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-emerald-700 font-bold font-mono text-xs">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{formatTime(m.awal.scannedAt)}</span>
                                {isNewAwal && (
                                  <span className="text-[9px] uppercase bg-emerald-100 text-emerald-800 px-1 rounded animate-pulse">
                                    Baru
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {m.awal.method === "qr_scan" ? "Scan HP" : "Manual"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum -</span>
                          )}
                        </td>

                        {/* 2. Presensi Akhir */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {m.akhir?.isAttended ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-blue-700 font-bold font-mono text-xs">
                                <Check className="h-3.5 w-3.5 text-blue-600" />
                                <span>{formatTime(m.akhir.scannedAt)}</span>
                                {isNewAkhir && (
                                  <span className="text-[9px] uppercase bg-blue-100 text-blue-800 px-1 rounded animate-pulse">
                                    Baru
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {m.akhir.method === "qr_scan" ? "Scan HP" : "Manual"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Belum -</span>
                          )}
                        </td>

                        {/* Status Rekap */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {m.kehadiranState === "lengkap" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Hadir Lengkap
                            </span>
                          )}
                          {m.kehadiranState === "hanya_awal" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Belum Presensi Akhir
                            </span>
                          )}
                          {m.kehadiranState === "hanya_akhir" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Susulan Akhir
                            </span>
                          )}
                          {m.kehadiranState === "alpha" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 bg-slate-100">
                              Alpha
                            </span>
                          )}
                        </td>

                        {/* Aksi Manual */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMemberForManual(m)
                              setManualSlot(
                                !m.awal?.isAttended && !m.akhir?.isAttended
                                  ? "both"
                                  : !m.awal?.isAttended
                                  ? "awal"
                                  : "akhir"
                              )
                            }}
                            className="h-8 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                          >
                            Ubah / Absen Manual
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Footer Minimalist */}
      <footer className="text-center py-4 text-[10px] font-mono text-slate-400 border-t border-slate-200/80 bg-white">
        OSI 2026 • Layar Monitor Presensi Real-Time (Presensi Awal & Presensi Akhir)
      </footer>

      {/* Modal Dialog Absen Manual */}
      {selectedMemberForManual && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedMemberForManual(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedMemberForManual(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Presensi Manual Operator • Sesi {sessionNumber}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {selectedMemberForManual.name}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {selectedMemberForManual.nim} • {selectedMemberForManual.kelompok}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <span className="font-semibold text-slate-600 block">Status Saat Ini:</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Presensi Awal:</span>
                  <span className={`font-bold ${selectedMemberForManual.awal?.isAttended ? "text-emerald-600" : "text-slate-400"}`}>
                    {selectedMemberForManual.awal?.isAttended ? formatTime(selectedMemberForManual.awal.scannedAt) : "Belum"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Presensi Akhir:</span>
                  <span className={`font-bold ${selectedMemberForManual.akhir?.isAttended ? "text-blue-600" : "text-slate-400"}`}>
                    {selectedMemberForManual.akhir?.isAttended ? formatTime(selectedMemberForManual.akhir.scannedAt) : "Belum"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Presensi yang Ingin Dicatat:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setManualSlot("awal")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualSlot === "awal"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Presensi Awal
                </button>
                <button
                  type="button"
                  onClick={() => setManualSlot("akhir")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualSlot === "akhir"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Presensi Akhir
                </button>
                <button
                  type="button"
                  onClick={() => setManualSlot("both")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualSlot === "both"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Keduanya
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedMemberForManual(null)}
                className="flex-1 h-10 rounded-xl border-slate-200 text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveManual}
                disabled={isSubmittingManual}
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs"
              >
                {isSubmittingManual ? "Menyimpan..." : "Simpan Kehadiran"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

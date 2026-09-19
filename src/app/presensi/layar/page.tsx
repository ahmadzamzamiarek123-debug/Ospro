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
  Radio,
  QrCode,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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
}

export default function PresensiLayarPage() {
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")

  // Data Kehadiran
  const [members, setMembers] = useState<MemberAttendance[]>([])
  const [totalPeserta, setTotalPeserta] = useState(0)
  const [totalPesertaHadir, setTotalPesertaHadir] = useState(0)
  const [totalPanitia, setTotalPanitia] = useState(0)
  const [totalPanitiaHadir, setTotalPanitiaHadir] = useState(0)
  const [totalSemua, setTotalSemua] = useState(0)
  const [totalHadir, setTotalHadir] = useState(0)

  // Filter State (Default fokus ke yang sudah hadir sesuai instruksi)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"hadir" | "belum" | "semua">("hadir")
  const [roleFilter, setRoleFilter] = useState<"semua" | "peserta" | "panitia">("semua")
  const [kelompokFilter, setKelompokFilter] = useState<string>("semua")
  const [isSubmittingManual, setIsSubmittingManual] = useState<string | null>(null)

  // Polling & Realtime Data Kehadiran
  const fetchAttendanceList = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/attendance/list?session=${sessionNumber}`)
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        setTotalPeserta(data.totalPeserta || 0)
        setTotalPesertaHadir(data.totalPesertaHadir || 0)
        setTotalPanitia(data.totalPanitia || 0)
        setTotalPanitiaHadir(data.totalPanitiaHadir || 0)
        setTotalSemua(data.totalSemua || 0)
        setTotalHadir(data.totalHadir || 0)
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

  // Supabase Realtime WebSocket Connection (Instant Update saat HP Scan Tiket)
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
  const handleManualAbsen = async (member: MemberAttendance) => {
    setIsSubmittingManual(member.id)
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          sessionNumber,
          status: "hadir"
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${member.name} berhasil diabsenkan!`)
        fetchAttendanceList()
      } else {
        toast.error(data.error || "Gagal mengabsenkan")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setIsSubmittingManual(null)
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
      if (statusFilter === "hadir") return m.isAttended
      if (statusFilter === "belum") return !m.isAttended
      return true
    })
    // Urutkan: Yang baru hadir paling atas jika di filter hadir/semua
    .sort((a, b) => {
      if (statusFilter === "hadir" || statusFilter === "semua") {
        if (a.isAttended && b.isAttended) {
          const timeA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0
          const timeB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0
          return timeB - timeA
        }
        if (a.isAttended && !b.isAttended) return -1
        if (!a.isAttended && b.isAttended) return 1
      }
      return a.name.localeCompare(b.name)
    })

  // List Kelompok Unik untuk Dropdown
  const uniqueKelompok = Array.from(
    new Set(members.filter((m) => m.role === "peserta").map((m) => m.kelompok))
  ).filter(Boolean).sort()

  const persentaseHadir = totalPeserta > 0 ? Math.round((totalPesertaHadir / totalPeserta) * 100) : 0

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
              <span className="text-xs font-bold text-slate-600">Monitor Hadir (Laptop)</span>
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

            {/* Kembali ke Dashboard */}
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Ringkasan Statistik Real-Time */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Peserta Hadir */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Peserta Hadir Sesi {sessionNumber}</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {totalPesertaHadir}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {totalPeserta}</span>
              </span>
              <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                {persentaseHadir}%
              </span>
            </div>
            {/* Progress bar halus */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${persentaseHadir}%` }}
              />
            </div>
          </Card>

          {/* Card 2: Peserta Belum Hadir */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Belum Hadir</span>
              <UserX className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800 tracking-tight">
                {totalPeserta - totalPesertaHadir}
                <span className="text-xs font-normal text-slate-400 ml-1">Maba</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Standby
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Siap di-scan barcode tiketnya</p>
          </Card>

          {/* Card 3: Panitia Hadir */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Panitia Hadir</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-800 tracking-tight">
                {totalPanitiaHadir}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {totalPanitia}</span>
              </span>
              <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                {totalPanitia > 0 ? Math.round((totalPanitiaHadir / totalPanitia) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Panitia pelaksana bertugas</p>
          </Card>

          {/* Card 4: Status Monitor Real-Time */}
          <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Live Scanner Status</span>
              <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-sm font-bold text-slate-900">HP Scanner Aktif</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Sinkron terakhir: {lastSyncTime || "Baru saja"}
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

            {/* Filter Status (Hadir / Belum / Semua) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setStatusFilter("hadir")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === "hadir"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                Sudah Masuk ({totalHadir})
              </button>
              <button
                onClick={() => setStatusFilter("belum")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  statusFilter === "belum"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <UserX className="h-3.5 w-3.5 text-amber-400" />
                Belum Hadir ({totalSemua - totalHadir})
              </button>
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
                Panitia ({totalPanitia})
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
                <span>Daftar Kehadiran</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  (Menampilkan {filteredMembers.length} data)
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Data masuk otomatis secara real-time saat panitia men-scan barcode tiket di pintu masuk.
              </p>
            </div>

            {/* Petunjuk Live */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Urutan waktu scan terbaru</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Waktu Hadir</th>
                  <th className="py-3 px-4">Nama Peserta / Panitia</th>
                  <th className="py-3 px-4">NIM</th>
                  <th className="py-3 px-4">Kelompok / Divisi</th>
                  <th className="py-3 px-4">Metode Presensi</th>
                  <th className="py-3 px-4 text-right">Status / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada data kehadiran yang sesuai filter.</p>
                        <p className="text-[11px] text-slate-400">
                          {statusFilter === "hadir" 
                            ? "Belum ada peserta yang di-scan pada sesi ini. Mulai scan tiket menggunakan HP scanner panitia!"
                            : "Coba ubah kata kunci pencarian atau reset filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const isNew = isRecentScan(m.scannedAt)
                    return (
                      <tr 
                        key={m.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isNew ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* Waktu Masuk */}
                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {m.isAttended ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{formatTime(m.scannedAt)}</span>
                              {isNew && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded animate-pulse">
                                  <Sparkles className="h-2.5 w-2.5" /> Baru
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum hadir</span>
                          )}
                        </td>

                        {/* Nama */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-sm block">{m.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              {m.role === "panitia" ? "Panitia" : "Mahasiswa Baru"}
                            </span>
                          </div>
                        </td>

                        {/* NIM */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">
                          {m.nim}
                        </td>

                        {/* Kelompok */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[11px]">
                            {m.kelompok}
                          </span>
                        </td>

                        {/* Metode Scan */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {m.isAttended ? (
                            m.method === "qr_scan" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <QrCode className="h-3 w-3 text-slate-500" /> Scanner HP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                Operator Laptop
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Status / Aksi */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {m.isAttended ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Hadir
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleManualAbsen(m)}
                              disabled={isSubmittingManual === m.id}
                              className="h-8 rounded-xl bg-slate-900 hover:bg-black font-semibold text-xs px-3 text-white shadow-2xs transition-all active:scale-95"
                            >
                              {isSubmittingManual === m.id ? "..." : "Absenkan Manual"}
                            </Button>
                          )}
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
        OSI 2026 • Layar Monitor Presensi Real-Time
      </footer>
    </div>
  )
}

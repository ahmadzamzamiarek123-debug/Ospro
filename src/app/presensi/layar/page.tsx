"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Search, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Check 
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
  const sessionNumber = 1
  const [token, setToken] = useState<string>("")
  const [countdown, setCountdown] = useState<number>(60)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [origin, setOrigin] = useState("")

  // Data Kehadiran
  const [members, setMembers] = useState<MemberAttendance[]>([])
  const [totalPeserta, setTotalPeserta] = useState(0)
  const [totalPesertaHadir, setTotalPesertaHadir] = useState(0)
  const [totalPanitia, setTotalPanitia] = useState(0)
  const [totalPanitiaHadir, setTotalPanitiaHadir] = useState(0)

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"semua" | "peserta" | "panitia">("semua")
  const [statusFilter, setStatusFilter] = useState<"semua" | "belum" | "hadir">("semua")
  const [isSubmittingManual, setIsSubmittingManual] = useState<string | null>(null)

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  // Fetch token baru
  const fetchToken = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/attendance/token?session=${sessionNumber}`)
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        setCountdown(data.expiresInSeconds || 60)
      }
    } catch {
      toast.error("Gagal memperbarui barcode")
    } finally {
      setIsRefreshing(false)
    }
  }, [sessionNumber])

  // Polling data kehadiran
  const fetchAttendanceList = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/list?session=${sessionNumber}`)
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        setTotalPeserta(data.totalPeserta || 0)
        setTotalPesertaHadir(data.totalPesertaHadir || 0)
        setTotalPanitia(data.totalPanitia || 0)
        setTotalPanitiaHadir(data.totalPanitiaHadir || 0)
      }
    } catch {
      // ignore
    }
  }, [sessionNumber])

  useEffect(() => {
    fetchToken()
    fetchAttendanceList()
  }, [fetchToken, fetchAttendanceList])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendanceList()
    }, 4000)
    return () => clearInterval(interval)
  }, [fetchAttendanceList])

  // Countdown timer
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchToken()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [fetchToken])

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Absenkan Manual
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
        toast.success(`${member.name} berhasil diabsenkan`)
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

  const qrUrl = origin && token ? `${origin}/absen?token=${encodeURIComponent(token)}` : ""

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kelompok.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchSearch) return false
    if (roleFilter !== "semua" && m.role !== roleFilter) return false
    if (statusFilter === "belum") return !m.isAttended
    if (statusFilter === "hadir") return m.isAttended
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar Minimalist */}
      <nav className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">
              KEDIS<span className="text-primary">.</span>
            </Link>
            <span className="text-xs font-semibold text-slate-400 border-l border-slate-200 pl-3">
              Presensi Sesi {sessionNumber}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Status Counter Peserta & Panitia */}
            <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span>
                Peserta: <strong className="text-slate-900">{totalPesertaHadir}</strong>/{totalPeserta}
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Panitia: <strong className="text-slate-900">{totalPanitiaHadir}</strong>/{totalPanitia}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 rounded-lg gap-1.5"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? "Keluar" : "Fullscreen"}</span>
            </Button>

            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 rounded-lg gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kembali</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container max-w-3xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        <Tabs defaultValue="barcode" className="w-full flex flex-col items-center">
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
            <TabsTrigger
              value="barcode"
              className="rounded-lg px-4 h-8 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs transition-all"
            >
              Barcode Layar
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="rounded-lg px-4 h-8 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-xs transition-all"
            >
              Daftar Manual ({members.filter((m) => !m.isAttended).length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BARCODE QR */}
          <TabsContent value="barcode" className="m-0 w-full max-w-xs flex flex-col items-center focus-visible:outline-none">
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white w-full p-6 text-center space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900">Barcode Presensi</h2>
                <p className="text-xs text-slate-500">
                  Scan untuk presensi kehadiran sesi ini
                </p>
              </div>

              {/* QR Container Minimalist */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-center inline-block mx-auto">
                {qrUrl ? (
                  <QRCodeSVG
                    value={qrUrl}
                    size={220}
                    level="H"
                    includeMargin={false}
                    className="w-[220px] h-[220px]"
                  />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-300">
                    <RotateCw className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Timer & Refresh */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="font-mono">{countdown}s</span>
                <button
                  type="button"
                  onClick={fetchToken}
                  disabled={isRefreshing}
                  className="font-medium text-slate-700 hover:text-slate-950 inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                  Perbarui
                </button>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: PRESENSI MANUAL */}
          <TabsContent value="manual" className="m-0 w-full focus-visible:outline-none">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white w-full">
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      placeholder="Cari Nama, NIM, atau Kelompok/Divisi..."
                      className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Role (Peserta / Panitia) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setRoleFilter("semua")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        roleFilter === "semua" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setRoleFilter("peserta")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        roleFilter === "peserta" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Peserta ({totalPeserta})
                    </button>
                    <button
                      onClick={() => setRoleFilter("panitia")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        roleFilter === "panitia" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Panitia ({totalPanitia})
                    </button>
                  </div>
                </div>

                {/* Filter Status (Semua / Belum / Hadir) */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
                  <button
                    onClick={() => setStatusFilter("semua")}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                      statusFilter === "semua" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({members.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("belum")}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                      statusFilter === "belum" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Belum Hadir ({members.filter((m) => !m.isAttended).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("hadir")}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                      statusFilter === "hadir" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Sudah Hadir ({members.filter((m) => m.isAttended).length})
                  </button>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                      Tidak ada data ditemukan.
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{m.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-600">
                              {m.role === "panitia" ? `Panitia • ${m.kelompok}` : m.kelompok}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400">NIM: {m.nim}</p>
                        </div>

                        <div>
                          {m.isAttended ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              Hadir
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleManualAbsen(m)}
                              disabled={isSubmittingManual === m.id}
                              className="h-8 rounded-lg bg-primary hover:bg-blue-600 font-bold text-xs px-3"
                            >
                              {isSubmittingManual === m.id ? "..." : "Absenkan"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

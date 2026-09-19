"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCw, 
  Volume2, 
  VolumeX 
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ScanResult {
  status: "success" | "warning" | "error"
  name?: string
  nim?: string
  kelompok?: string
  message: string
  time?: string
}

export default function MobileScannerPage() {
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [recentScans, setRecentScans] = useState<Array<{ name: string; nim: string; time: string; status: "success" | "warning" }>>([])
  const [totalScannedToday, setTotalScannedToday] = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [manualNim, setManualNim] = useState<string>("")
  const [isManualLoading, setIsManualLoading] = useState<boolean>(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const isCooldownRef = useRef<boolean>(false)

  // Web Audio API sintetis untuk bunyi beep instan tanpa file eksternal
  const playBeep = useCallback((type: "success" | "warning" | "error") => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime) // 880 Hz
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(587, ctx.currentTime) // 587 Hz
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime) // 300 Hz low
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      }

      osc.connect(gain)
      gain.connect(ctx.destination)

      // Haptic feedback (getar HP)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (type === "success") navigator.vibrate(80)
        else if (type === "warning") navigator.vibrate([60, 50, 60])
        else navigator.vibrate([150])
      }
    } catch {
      // AudioContext tidak didukung / diizinkan browser
    }
  }, [soundEnabled])

  // Proses token hasil scan ke API
  const handleProcessToken = useCallback(async (tokenString: string) => {
    if (isCooldownRef.current) return
    isCooldownRef.current = true

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenString, sessionNumber })
      })

      const data = await res.json()
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

      if (res.ok) {
        if (data.alreadyAttended) {
          // Kuning: Sudah pernah absen
          playBeep("warning")
          setScanResult({
            status: "warning",
            name: data.member?.name,
            nim: data.member?.nim,
            kelompok: data.member?.kelompok,
            message: data.message || "Sudah tercatat hadir sebelumnya",
            time: timeStr
          })
          setRecentScans((prev) => [
            { name: data.member?.name || "-", nim: data.member?.nim || "-", time: timeStr, status: "warning" },
            ...prev.slice(0, 4)
          ])
        } else {
          // Hijau: Berhasil presensi baru
          playBeep("success")
          setScanResult({
            status: "success",
            name: data.member?.name,
            nim: data.member?.nim,
            kelompok: data.member?.kelompok,
            message: "Presensi Berhasil Dicatat",
            time: timeStr
          })
          setTotalScannedToday((prev) => prev + 1)
          setRecentScans((prev) => [
            { name: data.member?.name || "-", nim: data.member?.nim || "-", time: timeStr, status: "success" },
            ...prev.slice(0, 4)
          ])
        }
      } else {
        // Merah: Error / Barcode tidak sah
        playBeep("error")
        setScanResult({
          status: "error",
          message: data.error || "Gagal memvalidasi barcode"
        })
      }
    } catch {
      playBeep("error")
      setScanResult({
        status: "error",
        message: "Gangguan koneksi saat mengirim data presensi"
      })
    } finally {
      // Cooldown 1.2 detik sebelum siap scan maba berikutnya
      setTimeout(() => {
        isCooldownRef.current = false
      }, 1200)
    }
  }, [sessionNumber, playBeep])

  // Mulai Kamera Pemindai
  const startScanner = useCallback(async () => {
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader")
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleProcessToken(decodedText)
        },
        () => {
          // ignore scan frame error (no QR in view)
        }
      )

      setIsScanning(true)
      setHasCameraPermission(true)
    } catch {
      setIsScanning(false)
      setHasCameraPermission(false)
      toast.error("Gagal membuka kamera. Pastikan Anda mengizinkan akses kamera di browser.")
    }
  }, [handleProcessToken])

  // Matikan Kamera
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch {
        // ignore
      }
      setIsScanning(false)
    }
  }, [isScanning])

  useEffect(() => {
    startScanner()
    return () => {
      stopScanner()
    }
  }, [startScanner, stopScanner])

  // Submit Manual jika barcode rusak / kamera bermasalah
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualNim.trim()) return

    setIsManualLoading(true)
    await handleProcessToken(manualNim.trim())
    setManualNim("")
    setIsManualLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Navigation */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-600" />}
          </Button>

          <Badge 
            onClick={() => setSessionNumber((prev) => (prev % 4) + 1)}
            className="bg-blue-600/30 hover:bg-blue-600/50 cursor-pointer text-blue-400 border-none font-bold text-[10px] px-2.5 py-1 transition-all"
            title="Klik untuk ganti sesi"
          >
            Sesi {sessionNumber}
          </Badge>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="w-full max-w-md mx-auto space-y-4 my-auto">
        {/* Camera Viewfinder Card */}
        <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl aspect-square flex items-center justify-center">
          <div id="reader" className="w-full h-full object-cover" />

          {/* Scanner Crosshair Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative">
                {/* Laser animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce" />
                <span className="absolute -top-6 left-0 right-0 text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Arahkan ke Barcode Maba
                </span>
              </div>
            </div>
          )}

          {/* Camera Permission Denied Overlay */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <CameraOff className="h-10 w-10 text-red-400" />
              <p className="text-sm font-bold text-slate-200">Izin Kamera Ditolak</p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Silakan izinkan akses kamera di ikon gembok URL browser Anda, lalu klik tombol di bawah ini.
              </p>
              <Button onClick={startScanner} size="sm" className="rounded-xl bg-blue-600 font-bold text-xs mt-2">
                <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
              </Button>
            </div>
          )}
        </div>

        {/* Live Feedback Card */}
        {scanResult && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {scanResult.status === "success" && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-3 text-emerald-400">
                <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="overflow-hidden space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-base truncate">{scanResult.name}</span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      {scanResult.kelompok}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-emerald-300">NIM: {scanResult.nim}</p>
                  <p className="text-[10px] text-emerald-400/80 font-medium pt-0.5">
                    ✓ {scanResult.message} • {scanResult.time} WIB
                  </p>
                </div>
              </div>
            )}

            {scanResult.status === "warning" && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3 text-amber-400">
                <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5 text-amber-400" />
                <div className="overflow-hidden space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-base truncate">{scanResult.name}</span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      {scanResult.kelompok}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-amber-300">NIM: {scanResult.nim}</p>
                  <p className="text-[10px] text-amber-400 font-bold pt-0.5">
                    ⚠️ {scanResult.message}
                  </p>
                </div>
              </div>
            )}

            {scanResult.status === "error" && (
              <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start gap-3 text-red-400">
                <XCircle className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="overflow-hidden space-y-0.5">
                  <span className="font-bold text-white text-sm">Gagal Presensi</span>
                  <p className="text-xs text-red-300 leading-relaxed font-medium">{scanResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Counter Summary */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hadir Sesi Ini</span>
            <span className="text-xl font-black text-emerald-400">{totalScannedToday} Maba</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Mode Presensi</span>
            <span className="text-xs font-black text-blue-400 flex items-center justify-center gap-1 mt-1">
              <Camera className="h-3 w-3" /> Scanner HP
            </span>
          </div>
        </div>

        {/* Manual NIM Input Drawer (Backup jika kamera terkendala) */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Presensi Darurat (Ketik NIM Manual)
          </span>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Ketik NIM maba..."
              value={manualNim}
              onChange={(e) => setManualNim(e.target.value)}
              className="h-10 bg-slate-800 border-slate-700 text-white rounded-xl text-xs font-mono"
            />
            <Button
              type="submit"
              disabled={isManualLoading}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs shrink-0"
            >
              {isManualLoading ? "..." : "Absen"}
            </Button>
          </form>
        </div>

        {/* History Scan Mini List */}
        {recentScans.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Scan Terakhir
            </span>
            <div className="space-y-1">
              {recentScans.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.status === "success" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="font-bold text-slate-200 truncate">{s.name}</span>
                    <span className="font-mono text-slate-500 text-[10px]">({s.nim})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">{s.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-2">
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          Scanner Presensi • KEDIS OSPRO 2026
        </p>
      </footer>
    </div>
  )
}

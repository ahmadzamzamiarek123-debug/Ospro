"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode"
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
  VolumeX,
  Image as ImageIcon,
  SwitchCamera
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

interface CameraDevice {
  id: string
  label: string
}

export default function MobileScannerPage() {
  const [sessionNumber, setSessionNumber] = useState<number>(1)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [activeCameraIndex, setActiveCameraIndex] = useState<number>(0)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [recentScans, setRecentScans] = useState<Array<{ name: string; nim: string; time: string; status: "success" | "warning" }>>([])
  const [totalScannedToday, setTotalScannedToday] = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [manualNim, setManualNim] = useState<string>("")
  const [isManualLoading, setIsManualLoading] = useState<boolean>(false)
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const isCooldownRef = useRef<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const sessionNumberRef = useRef<number>(sessionNumber)
  const soundEnabledRef = useRef<boolean>(soundEnabled)

  useEffect(() => {
    sessionNumberRef.current = sessionNumber
  }, [sessionNumber])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Web Audio API sintetis untuk bunyi beep instan tanpa file eksternal
  const playBeep = useCallback((type: "success" | "warning" | "error") => {
    if (!soundEnabledRef.current) return
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
  }, [])

  // Proses token hasil scan ke API
  const handleProcessToken = useCallback(async (tokenString: string) => {
    if (isCooldownRef.current) return
    isCooldownRef.current = true

    try {
      const currentSession = sessionNumberRef.current
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenString, sessionNumber: currentSession })
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
  }, [playBeep])

  const handleProcessTokenRef = useRef(handleProcessToken)
  useEffect(() => {
    handleProcessTokenRef.current = handleProcessToken
  }, [handleProcessToken])

  // Hentikan scanner dengan aman
  const stopScannerSafe = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await html5QrCodeRef.current.stop()
        }
      } catch (err) {
        console.warn("Error stopping scanner:", err)
      }
      setIsScanning(false)
    }
  }, [])

  // Inisialisasi & Mulai Kamera Pemindai secara Bertingkat (Cascading Fallback)
  const startScanner = useCallback(async (targetCameraId?: string) => {
    if (typeof window === "undefined") return

    setIsStartingCamera(true)
    setErrorMessage(null)

    // 1. Cek Protokol Keamanan (Kamera mewajibkan HTTPS atau localhost)
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    if (window.location.protocol !== "https:" && !isLocalhost) {
      const msg = "Browser mewajibkan koneksi HTTPS untuk membuka kamera. Silakan buka web melalui domain Vercel (https://...)."
      setErrorMessage(msg)
      setIsStartingCamera(false)
      toast.error(msg)
      return
    }

    // 2. Cek ketersediaan mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Browser atau perangkat ini tidak mendukung akses kamera (MediaDevices API)."
      setErrorMessage(msg)
      setIsStartingCamera(false)
      toast.error(msg)
      return
    }

    try {
      // Pastikan scanner sebelumnya dihentikan
      await stopScannerSafe()

      // Buat instance jika belum ada
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader")
      }

      // Ambil daftar kamera perangkat
      let cameras: CameraDevice[] = []
      try {
        cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras)
        }
      } catch (e) {
        console.warn("getCameras info:", e)
      }

      // Tentukan kamera yang akan dicoba
      let preferredCameraId = targetCameraId

      if (!preferredCameraId && cameras.length > 0) {
        // Cari kamera belakang (rear/back/environment/belakang)
        const backCamera = cameras.find((c) => {
          const lbl = (c.label || "").toLowerCase()
          return lbl.includes("back") || lbl.includes("rear") || lbl.includes("environment") || lbl.includes("belakang")
        })
        if (backCamera) {
          preferredCameraId = backCamera.id
        } else if (cameras.length > 1) {
          // Biasanya kamera belakang terletak di urutan terakhir
          preferredCameraId = cameras[cameras.length - 1].id
        } else {
          preferredCameraId = cameras[0].id
        }
      }

      // Daftar strategi kamera secara berurutan
      const candidateConfigs: Array<string | MediaTrackConstraints> = []
      if (preferredCameraId) candidateConfigs.push(preferredCameraId)
      candidateConfigs.push({ facingMode: "environment" })
      candidateConfigs.push({ facingMode: { ideal: "environment" } })
      candidateConfigs.push({ facingMode: "user" })
      candidateConfigs.push({}) // Kamera default apa saja yang ada

      let startedSuccessfully = false
      let lastCaughtError: unknown = null

      for (const config of candidateConfigs) {
        try {
          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("reader")
          }

          await html5QrCodeRef.current.start(
            config,
            {
              fps: 15,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
                const qrboxSize = Math.floor(minEdge * 0.75)
                return {
                  width: Math.max(qrboxSize, 180),
                  height: Math.max(qrboxSize, 180)
                }
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              handleProcessTokenRef.current(decodedText)
            },
            () => {
              // Abaikan frame scan tanpa QR
            }
          )

          startedSuccessfully = true
          break
        } catch (err) {
          lastCaughtError = err
          console.warn("Mencoba konfigurasi kamera lain...", config, err)
        }
      }

      if (startedSuccessfully) {
        setIsScanning(true)
        setErrorMessage(null)
      } else {
        throw lastCaughtError || new Error("Gagal memulai kamera dengan seluruh opsi yang tersedia.")
      }
    } catch (err: unknown) {
      console.error("Camera start error:", err)
      setIsScanning(false)

      const errorObj = err as { name?: string; message?: string }
      const errName = errorObj?.name || ""
      const errMsg = errorObj?.message || String(err)

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setErrorMessage("Izin kamera tidak diizinkan. Ketuk ikon gembok/setelan di sebelah URL browser dan izinkan kamera.")
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setErrorMessage("Tidak ditemukan perangkat kamera pada HP/laptop ini.")
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setErrorMessage("Kamera sedang digunakan oleh aplikasi/tab browser lain. Tutup aplikasi lain lalu coba lagi.")
      } else if (errName === "OverconstrainedError") {
        setErrorMessage("Kamera tidak memenuhi kriteria sensor. Coba ganti pilihan kamera atau scan lewat galeri.")
      } else {
        setErrorMessage(`Kamera belum dapat dibuka: ${errMsg}. Anda tetap bisa menggunakan upload foto barcode atau input manual di bawah.`)
      }
      toast.error("Tidak dapat mengakses kamera.")
    } finally {
      setIsStartingCamera(false)
    }
  }, [stopScannerSafe])

  // Ganti kamera jika ada lebih dari 1 kamera
  const handleSwitchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      toast.info("Hanya 1 kamera yang terdeteksi pada perangkat ini.")
      return
    }

    const nextIndex = (activeCameraIndex + 1) % availableCameras.length
    setActiveCameraIndex(nextIndex)
    const nextCam = availableCameras[nextIndex]
    toast.info(`Beralih ke: ${nextCam.label || `Kamera ${nextIndex + 1}`}`)
    await startScanner(nextCam.id)
  }, [availableCameras, activeCameraIndex, startScanner])

  // Scan file gambar dari galeri/penyimpanan
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      toast.loading("Membaca barcode dari gambar...")
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader")
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, true)
      toast.dismiss()
      handleProcessTokenRef.current(decodedText)
    } catch (err) {
      toast.dismiss()
      console.warn("Scan file error:", err)
      playBeep("error")
      toast.error("Barcode tidak terdeteksi pada gambar tersebut.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Lifecycle: Mulai kamera saat komponen dimuat, bersihkan saat unmount
  useEffect(() => {
    startScanner()
    return () => {
      stopScannerSafe()
    }
  }, [startScanner, stopScannerSafe])

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
      {/* Hidden File Input untuk scan dari galeri */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleScanImageFile}
      />

      {/* Top Navigation */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
        </Link>

        <div className="flex items-center gap-2">
          {/* Switch Camera Button jika multi-kamera */}
          {availableCameras.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSwitchCamera}
              disabled={isStartingCamera}
              className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full text-xs font-bold flex items-center gap-1"
              title="Ganti Kamera"
            >
              <SwitchCamera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kamera</span>
            </Button>
          )}

          {/* Sound Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            title="Suara Beep"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-600" />}
          </Button>

          {/* Session Switcher */}
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
          {/* Container Video HTML5 QR Code */}
          <div id="reader" className="w-full h-full object-cover" />

          {/* Scanner Crosshair Overlay saat aktif */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative">
                {/* Laser line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce" />
                <span className="absolute -top-6 left-0 right-0 text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Arahkan ke Barcode Maba
                </span>
              </div>
            </div>
          )}

          {/* Camera Loading Overlay */}
          {isStartingCamera && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <RotateCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-slate-200">Sedang Menghubungkan Kamera...</p>
            </div>
          )}

          {/* Camera Permission / Error Overlay */}
          {!isScanning && !isStartingCamera && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <CameraOff className="h-10 w-10 text-amber-400" />
              <p className="text-sm font-bold text-slate-200">Kamera Belum Terbuka</p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {errorMessage || "Pastikan browser mengizinkan kamera dan Anda membuka web melalui HTTPS (Vercel)."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button 
                  onClick={() => startScanner()} 
                  size="sm" 
                  disabled={isStartingCamera}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs"
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Buka Kamera
                </Button>

                {availableCameras.length > 1 && (
                  <Button 
                    onClick={handleSwitchCamera} 
                    size="sm" 
                    variant="outline"
                    className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs"
                  >
                    <SwitchCamera className="h-3.5 w-3.5 mr-1.5" /> Ganti Kamera
                  </Button>
                )}

                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  size="sm" 
                  variant="outline"
                  className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs"
                >
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Scan dari Foto
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Toolbar (Pilih Foto & Ganti Kamera) saat kamera aktif */}
        {isScanning && (
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              <ImageIcon className="h-3 w-3" /> Scan dari Galeri / Foto
            </button>

            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <SwitchCamera className="h-3 w-3" /> Ganti Kamera ({activeCameraIndex + 1}/{availableCameras.length})
              </button>
            )}
          </div>
        )}

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
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Presensi Darurat (Ketik NIM Manual)
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Bypass Kamera</span>
          </div>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Contoh: 26120008"
              value={manualNim}
              onChange={(e) => setManualNim(e.target.value)}
              className="h-10 bg-slate-800 border-slate-700 text-white rounded-xl text-xs font-mono placeholder:text-slate-500"
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

      {/* Custom CSS untuk Html5Qrcode video element */}
      <style jsx global>{`
        #reader {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
        }
        #reader__scan_region {
          background: transparent !important;
        }
        #reader__dashboard_section {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

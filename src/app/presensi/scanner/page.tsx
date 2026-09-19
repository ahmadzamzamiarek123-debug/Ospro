"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Camera, 
  Volume2, 
  VolumeX,
  Image as ImageIcon,
  SwitchCamera,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle
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
  const [slot, setSlot] = useState<"awal" | "akhir">("awal")
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [activeCameraIndex, setActiveCameraIndex] = useState<number>(0)
  const [scanResult, setScanResult] = useState<(ScanResult & { slotLabel?: string; slot?: "awal" | "akhir" }) | null>(null)
  const [recentScans, setRecentScans] = useState<Array<{ name: string; nim: string; time: string; status: "success" | "warning"; slotLabel?: string }>>([])
  const [totalScannedToday, setTotalScannedToday] = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [manualNim, setManualNim] = useState<string>("")
  const [isManualLoading, setIsManualLoading] = useState<boolean>(false)
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const isCooldownRef = useRef<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const sessionNumberRef = useRef<number>(sessionNumber)
  const slotRef = useRef<"awal" | "akhir">(slot)
  const soundEnabledRef = useRef<boolean>(soundEnabled)

  useEffect(() => {
    sessionNumberRef.current = sessionNumber
  }, [sessionNumber])

  useEffect(() => {
    slotRef.current = slot
  }, [slot])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Ambil Sesi Aktif Terpusat dari Server saat HP Scanner dibuka
  useEffect(() => {
    async function loadCentralSession() {
      try {
        const res = await fetch("/api/session/active")
        const data = await res.json()
        if (data.success && data.sessionNumber) {
          setSessionNumber(data.sessionNumber)
        }
      } catch {
        // Abaikan jika offline/error
      }
    }
    loadCentralSession()
  }, [])

  // Audio tone
  const playBeep = useCallback((type: "success" | "warning" | "error") => {
    if (!soundEnabledRef.current) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(580, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      }

      osc.connect(gain)
      gain.connect(ctx.destination)

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (type === "success") navigator.vibrate(60)
        else if (type === "warning") navigator.vibrate([40, 40, 40])
        else navigator.vibrate(100)
      }
    } catch {
      // AudioContext unavailable
    }
  }, [])

  // Process token or NIM
  const handleProcessToken = useCallback(async (tokenString: string) => {
    if (isCooldownRef.current) return
    isCooldownRef.current = true

    try {
      const currentSession = sessionNumberRef.current
      const currentSlot = slotRef.current
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenString,
          sessionNumber: currentSession,
          slot: currentSlot
        })
      })

      const data = await res.json()
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      const slotLabel = data.slotLabel || (currentSlot === "akhir" ? "Presensi Akhir" : "Presensi Awal")

      if (res.ok) {
        if (data.alreadyAttended) {
          playBeep("warning")
          setScanResult({
            status: "warning",
            name: data.member?.name,
            nim: data.member?.nim,
            kelompok: data.member?.kelompok,
            message: data.message || `Sudah tercatat di ${slotLabel}`,
            time: timeStr,
            slot: currentSlot,
            slotLabel
          })
          setRecentScans((prev) => [
            { name: data.member?.name || "-", nim: data.member?.nim || "-", time: timeStr, status: "warning", slotLabel },
            ...prev.slice(0, 3)
          ])
        } else {
          playBeep("success")
          setScanResult({
            status: "success",
            name: data.member?.name,
            nim: data.member?.nim,
            kelompok: data.member?.kelompok,
            message: data.message || `${slotLabel} Berhasil`,
            time: timeStr,
            slot: currentSlot,
            slotLabel
          })
          setTotalScannedToday((prev) => prev + 1)
          setRecentScans((prev) => [
            { name: data.member?.name || "-", nim: data.member?.nim || "-", time: timeStr, status: "success", slotLabel },
            ...prev.slice(0, 3)
          ])
        }
      } else {
        playBeep("error")
        setScanResult({
          status: "error",
          message: data.error || "Gagal memproses"
        })
      }
    } catch {
      playBeep("error")
      setScanResult({
        status: "error",
        message: "Gangguan jaringan"
      })
    } finally {
      setTimeout(() => {
        isCooldownRef.current = false
      }, 1200)
    }
  }, [playBeep])

  const handleProcessTokenRef = useRef(handleProcessToken)
  useEffect(() => {
    handleProcessTokenRef.current = handleProcessToken
  }, [handleProcessToken])

  const stopScannerSafe = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await html5QrCodeRef.current.stop()
        }
      } catch {
        // ignore
      }
      setIsScanning(false)
    }
  }, [])

  const startScanner = useCallback(async (targetCameraId?: string) => {
    if (typeof window === "undefined") return

    setIsStartingCamera(true)
    setErrorMessage(null)

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    if (window.location.protocol !== "https:" && !isLocalhost) {
      setErrorMessage("Kamera mewajibkan HTTPS.")
      setIsStartingCamera(false)
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Kamera tidak didukung pada browser ini.")
      setIsStartingCamera(false)
      return
    }

    try {
      await stopScannerSafe()

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader")
      }

      let cameras: CameraDevice[] = []
      try {
        cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras)
        }
      } catch {
        // ignore
      }

      let preferredCameraId = targetCameraId
      if (!preferredCameraId && cameras.length > 0) {
        const backCamera = cameras.find((c) => {
          const lbl = (c.label || "").toLowerCase()
          return lbl.includes("back") || lbl.includes("rear") || lbl.includes("environment") || lbl.includes("belakang")
        })
        preferredCameraId = backCamera ? backCamera.id : (cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id)
      }

      const candidateConfigs: Array<string | MediaTrackConstraints> = []
      if (preferredCameraId) candidateConfigs.push(preferredCameraId)
      candidateConfigs.push({ facingMode: "environment" })
      candidateConfigs.push({ facingMode: { ideal: "environment" } })
      candidateConfigs.push({ facingMode: "user" })
      candidateConfigs.push({})

      let started = false
      let lastErr: unknown = null

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
                const size = Math.floor(minEdge * 0.75)
                return { width: Math.max(size, 180), height: Math.max(size, 180) }
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              handleProcessTokenRef.current(decodedText)
            },
            () => {}
          )

          started = true
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (started) {
        setIsScanning(true)
        setErrorMessage(null)
      } else {
        throw lastErr || new Error("Gagal memulai kamera")
      }
    } catch (err: unknown) {
      setIsScanning(false)
      const errorObj = err as { name?: string; message?: string }
      if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
        setErrorMessage("Izin kamera ditolak. Silakan izinkan kamera di browser.")
      } else {
        setErrorMessage("Kamera tidak dapat diakses.")
      }
    } finally {
      setIsStartingCamera(false)
    }
  }, [stopScannerSafe])

  const handleSwitchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) return
    const nextIndex = (activeCameraIndex + 1) % availableCameras.length
    setActiveCameraIndex(nextIndex)
    await startScanner(availableCameras[nextIndex].id)
  }, [availableCameras, activeCameraIndex, startScanner])

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader")
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true)
      handleProcessTokenRef.current(decodedText)
    } catch {
      playBeep("error")
      toast.error("Barcode tidak ditemukan pada foto.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    startScanner()
    return () => {
      stopScannerSafe()
    }
  }, [startScanner, stopScannerSafe])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualNim.trim()) return

    setIsManualLoading(true)
    await handleProcessToken(manualNim.trim())
    setManualNim("")
    setIsManualLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 max-w-md mx-auto select-none">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleScanImageFile}
      />

      {/* Minimal Header */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-400 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 pl-1">
            <img src="/logo.png" alt="OSI" className="h-6 w-6 object-contain" />
            <span className="text-sm font-black text-slate-900 tracking-tight">OSI 2026</span>
            <span className="text-[11px] font-medium text-slate-400">• Scanner</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {availableCameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/70 transition-colors"
              title="Ganti Kamera"
            >
              <SwitchCamera className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200/70 transition-colors"
            title="Suara"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-slate-700" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
          </button>

          <button
            onClick={() => setSessionNumber((prev) => (prev % 3) + 1)}
            className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
            title="Sesi Presensi (Klik untuk ganti manual jika perlu)"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sesi {sessionNumber}</span>
          </button>
        </div>
      </header>

      {/* Mode Presensi: Presensi Awal vs Presensi Akhir */}
      <div className="pt-1 pb-1">
        <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setSlot("awal")
              setScanResult(null)
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              slot === "awal"
                ? "bg-emerald-600 text-white shadow-sm scale-[1.01]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${slot === "awal" ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
            Presensi Awal
          </button>
          <button
            type="button"
            onClick={() => {
              setSlot("akhir")
              setScanResult(null)
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              slot === "akhir"
                ? "bg-blue-600 text-white shadow-sm scale-[1.01]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${slot === "akhir" ? "bg-white animate-pulse" : "bg-blue-500"}`} />
            Presensi Akhir
          </button>
        </div>
      </div>

      {/* Main Viewfinder */}
      <main className="space-y-4 my-auto">
        {/* Camera Box */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm aspect-square flex items-center justify-center">
          <div id="reader" className="w-full h-full object-cover" />

          {/* Minimalist reticle viewfinder corners */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
              <div className="w-52 h-52 relative border border-white/20 rounded-xl">
                {/* Corner notches */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 -mt-0.5 -ml-0.5 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 -mt-0.5 -mr-0.5 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 -mb-0.5 -ml-0.5 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 -mb-0.5 -mr-0.5 rounded-br-sm" />
              </div>
            </div>
          )}

          {/* Loading */}
          {isStartingCamera && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
              <RotateCw className="h-6 w-6 text-slate-300 animate-spin" />
              <span className="text-xs text-slate-300 font-medium">Membuka kamera...</span>
            </div>
          )}

          {/* Error / Off State */}
          {!isScanning && !isStartingCamera && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center gap-3 z-10">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Camera className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{errorMessage || "Kamera belum aktif"}</span>
              <div className="flex gap-2">
                <Button 
                  onClick={() => startScanner()} 
                  size="sm" 
                  className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-xs"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" /> Aktifkan Kamera
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  size="sm" 
                  variant="outline"
                  className="h-10 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  <ImageIcon className="h-3.5 w-3.5 mr-1" /> Pilih Foto
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Scan Result Notification */}
        {scanResult && (
          <div className="animate-in fade-in duration-150">
            {scanResult.status === "success" && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-slate-900">{scanResult.name}</span>
                    <span className="text-slate-500 ml-1.5 font-mono text-[11px]">({scanResult.nim})</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[10px] text-white ${
                    scanResult.slot === "akhir" ? "bg-blue-600" : "bg-emerald-600"
                  }`}>
                    {scanResult.slotLabel || (slot === "akhir" ? "Akhir" : "Awal")}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold font-mono text-[11px]">
                    {scanResult.kelompok}
                  </span>
                </div>
              </div>
            )}

            {scanResult.status === "warning" && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-slate-900">{scanResult.name}</span>
                    <span className="text-slate-500 ml-1.5 font-mono text-[11px]">({scanResult.nim})</span>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold font-mono text-[11px] shrink-0 ml-2">
                  Sudah {scanResult.slotLabel || "Hadir"}
                </span>
              </div>
            )}

            {scanResult.status === "error" && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-center gap-2.5 text-xs text-red-700 shadow-xs">
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span className="font-medium">{scanResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Manual NIM Input */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder={`Ketik NIM manual untuk ${slot === "awal" ? "Presensi Awal" : "Presensi Akhir"}...`}
            value={manualNim}
            onChange={(e) => setManualNim(e.target.value)}
            className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-mono focus-visible:ring-slate-300 shadow-xs"
          />
          <Button
            type="submit"
            disabled={isManualLoading}
            className={`h-11 px-4 rounded-xl text-white text-xs font-semibold shrink-0 shadow-xs transition-all ${
              slot === "akhir" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isManualLoading ? "..." : `Absen ${slot === "awal" ? "Awal" : "Akhir"}`}
          </Button>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="h-11 px-3.5 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs shrink-0 shadow-xs"
            title="Scan dari galeri"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </form>

        {/* Mini Status & Recent List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">
              Hadir Sesi {sessionNumber} ({slot === "awal" ? "Presensi Awal" : "Presensi Akhir"})
            </span>
            <span className="font-bold text-slate-900 font-mono text-sm">{totalScannedToday} Mahasiswa</span>
          </div>

          {recentScans.length > 0 && (
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
              {recentScans.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.status === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="truncate font-medium text-slate-800">{s.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">({s.nim})</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      s.slotLabel?.includes("Akhir") ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {s.slotLabel?.includes("Akhir") ? "Akhir" : "Awal"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="text-center py-3">
        <span className="text-[10px] font-mono text-slate-400">Presensi Barcode OSI 2026</span>
      </footer>

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
          border-radius: 1rem !important;
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

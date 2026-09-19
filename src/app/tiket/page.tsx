"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member } from "@/types/database"
import { generateTicketToken } from "@/lib/ticketToken"
import { getMentorForKelompok, formatWaNumber } from "@/lib/mentors"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, MessageCircle, RotateCcw, RotateCw, Maximize2, X } from "lucide-react"
import { toast } from "sonner"
import { toJpeg } from "html-to-image"

const ALL_KELOMPOK = [
  "Kelompok 1",
  "Kelompok 2",
  "Kelompok 3",
  "Kelompok 4",
  "Kelompok 5"
]

export default function TicketClaimPage() {
  const [nim, setNim] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSorting, setIsSorting] = useState(false)
  const [displayedGroupIndex, setDisplayedGroupIndex] = useState(0)
  const [member, setMember] = useState<Member | null>(null)
  const [ticketToken, setTicketToken] = useState<string>("")
  const [isZoomed, setIsZoomed] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState<string>("/logo.png")

  const cardRef = useRef<HTMLDivElement>(null)

  // Konversi logo menjadi base64 data URL agar kompatibel 100% dengan ekspor gambar JPG
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch("/logo.png")
        const blob = await res.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setLogoDataUrl(reader.result)
          }
        }
        reader.readAsDataURL(blob)
      } catch {
        // Fallback default path jika gagal fetch
      }
    }
    loadLogo()
  }, [])

  // Animasi singkat acak kelompok (1.2 detik)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSorting) {
      interval = setInterval(() => {
        setDisplayedGroupIndex((prev) => (prev + 1) % ALL_KELOMPOK.length)
      }, 70)
    }
    return () => clearInterval(interval)
  }, [isSorting])

  // ESC key listener & body scroll lock untuk modal zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsZoomed(false)
      }
    }
    if (isZoomed) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isZoomed])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNim = nim.trim()

    if (!cleanNim) {
      toast.error("Masukkan NIM.")
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .ilike("nim", cleanNim)
        .single()

      if (error || !data) {
        toast.error(`NIM ${cleanNim} tidak ditemukan.`)
        setIsLoading(false)
        return
      }

      // Animasi acak kelompok singkat 1.2 detik
      setIsSorting(true)
      setTimeout(() => {
        setIsSorting(false)
        setMember(data)
        const token = generateTicketToken(data.nim)
        setTicketToken(token)
        setIsLoading(false)
      }, 1200)
    } catch {
      toast.error("Koneksi bermasalah.")
      setIsLoading(false)
      setIsSorting(false)
    }
  }

  const handleReset = () => {
    setMember(null)
    setNim("")
    setTicketToken("")
    setIsZoomed(false)
  }

  // Fungsi Download Kartu Tiket Saja sebagai JPG
  const handleDownloadJpg = async () => {
    if (!cardRef.current || !member) return

    setIsDownloading(true)
    try {
      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node) => {
          // Abaikan petunjuk klik dari hasil JPG
          if (node instanceof HTMLElement && node.dataset.hideDownload === "true") {
            return false
          }
          return true
        },
      })

      const filename = `Tiket-OSI-2026-${member.nim}.jpg`
      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Tiket berhasil diunduh sebagai JPG!")
    } catch (err) {
      console.error("Gagal mendownload tiket:", err)
      toast.error("Gagal mengunduh gambar tiket. Silakan coba lagi.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <header className="w-full max-w-sm mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <img src={logoDataUrl} alt="Logo OSI" className="h-7 w-7 object-contain" />
          <span className="text-sm font-black tracking-tight text-slate-900">OSI 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-sm mx-auto my-auto">
        {/* State 1: Form Input */}
        {!member && !isSorting && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900">Tiket Peserta OSI 2026</h1>
              <p className="text-xs text-slate-500">
                Masukkan NIM untuk melihat kelompok dan barcode presensi.
              </p>
            </div>

            <form onSubmit={handleClaim} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  NIM
                </label>
                <Input
                  type="text"
                  placeholder="26120001"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  required
                  autoFocus
                  className="h-11 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl font-mono text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition-all"
              >
                {isLoading ? "Mencari..." : "Tampilkan Tiket"}
              </Button>
            </form>
          </div>
        )}

        {/* State 2: Animasi Singkat & Minimalis (1.2 detik) */}
        {isSorting && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs text-center space-y-4 animate-in fade-in duration-150">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-700 mx-auto">
              <RotateCw className="h-5 w-5 animate-spin text-slate-800" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Menentukan Kelompok...
              </p>
              <div className="h-9 flex items-center justify-center">
                <span className="text-xl font-black font-mono text-slate-900 tracking-tight">
                  {ALL_KELOMPOK[displayedGroupIndex]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Hasil Tiket & Barcode */}
        {member && !isSorting && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* KARTU TIKET PESERTA - Hanya bagian ini yang diunduh ke JPG */}
            <div 
              id="ticket-card"
              ref={cardRef}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <img src={logoDataUrl} alt="OSI" className="h-4 w-4 object-contain" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      OSI HIMASI 2026
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {member.name}
                  </h2>
                  <p className="text-xs font-mono text-slate-500">
                    {member.nim}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                    {member.kelompok || "Kelompok 1"}
                  </span>
                </div>
              </div>

              {/* QR Code Container dengan Logo OSI di Tengah */}
              <div className="flex flex-col items-center justify-center py-2">
                <div 
                  onClick={() => setIsZoomed(true)}
                  title="Klik untuk memperbesar barcode"
                  className="p-3 bg-white border border-slate-200 rounded-xl cursor-pointer group transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:shadow-sm"
                >
                  <QRCodeSVG
                    value={ticketToken}
                    size={180}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: logoDataUrl,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                </div>

                {/* Petunjuk Klik (disembunyikan saat diekspor ke JPG) */}
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  data-hide-download="true"
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mt-2 hover:text-slate-800 transition-colors"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Ketuk barcode untuk perbesar</span>
                </button>

                <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Berlaku untuk Sesi 1 - 4
                </span>
              </div>

              {/* Mentor Row */}
              {(() => {
                const mentor = getMentorForKelompok(member.kelompok)
                const mentorName = member.pendamping || mentor.pendamping
                const mentorWa = member.no_wa_pendamping || mentor.no_wa_pendamping

                return (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pendamping</span>
                      <span className="font-semibold text-slate-800">{mentorName}</span>
                      {mentorWa && (
                        <span className="text-[10px] font-mono text-slate-500 block">
                          {mentorWa}
                        </span>
                      )}
                    </div>

                    {mentorWa && (
                      <a
                        href={`https://wa.me/${formatWaNumber(mentorWa)}?text=Halo%20Kak,%20saya%20${encodeURIComponent(member.name)}%20(${member.nim})`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" /> WA
                      </a>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Action Buttons: Download JPG & Ganti NIM */}
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadJpg}
                disabled={isDownloading}
                className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
              >
                {isDownloading ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyiapkan JPG...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Tiket (JPG)</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isDownloading}
                className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ganti NIM
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm mx-auto text-center py-4">
        <p className="text-[10px] text-slate-400 font-mono">
          OSI • HIMASI 2026
        </p>
      </footer>

      {/* Modal Perbesar Barcode (Fullscreen Lightbox) */}
      {isZoomed && member && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tombol Tutup X */}
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Modal */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-center gap-1.5">
                <img src={logoDataUrl} alt="OSI" className="h-5 w-5 object-contain" />
                <span className="text-xs font-black tracking-tight text-slate-900">OSI 2026</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {member.name}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {member.nim} • <span className="font-bold text-slate-800">{member.kelompok || "Kelompok 1"}</span>
              </p>
            </div>

            {/* Barcode Besar dengan Logo OSI di Tengah */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-sm">
              <QRCodeSVG
                value={ticketToken}
                size={260}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: logoDataUrl,
                  height: 52,
                  width: 52,
                  excavate: true,
                }}
              />
            </div>

            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-500 font-medium">
                Arahkan barcode ini ke scanner panitia
              </p>
              <Button
                onClick={() => setIsZoomed(false)}
                variant="outline"
                className="w-full h-10 rounded-xl border-slate-200 text-xs font-semibold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

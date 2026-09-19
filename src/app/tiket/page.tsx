"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member } from "@/types/database"
import { generateTicketToken } from "@/lib/ticketToken"
import { getMentorForKelompok } from "@/lib/mentors"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer, MessageCircle, RotateCcw, RotateCw } from "lucide-react"
import { toast } from "sonner"

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
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 print:p-0 print:bg-white">
      {/* Top Bar - Terisolasi tanpa link keluar ke Beranda */}
      <header className="w-full max-w-sm mx-auto flex items-center justify-between pb-6 print:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-900" />
          <span className="text-xs font-bold tracking-tight text-slate-900">KEDIS OSPRO</span>
        </div>
        <span className="text-xs font-mono text-slate-400">2026</span>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-sm mx-auto my-auto">
        {/* State 1: Form Input */}
        {!member && !isSorting && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900">Tiket Peserta</h1>
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
            <div 
              id="ticket-card"
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 print:border-none print:shadow-none print:p-4"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                    OSPRO HIMASI 2026
                  </span>
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

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <QRCodeSVG
                    value={ticketToken}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2">
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
                    </div>

                    {mentorWa && (
                      <a
                        href={`https://wa.me/${mentorWa.replace(/[^0-9]/g, "")}?text=Halo%20Kak,%20saya%20${encodeURIComponent(member.name)}%20(${member.nim})`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 print:hidden transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" /> WA
                      </a>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 print:hidden">
              <Button
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak / Simpan
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ganti NIM
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm mx-auto text-center py-4 print:hidden">
        <p className="text-[10px] text-slate-400 font-mono">
          KEDIS • HIMASI
        </p>
      </footer>
    </div>
  )
}

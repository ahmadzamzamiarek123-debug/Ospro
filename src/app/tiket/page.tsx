"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member } from "@/types/database"
import { generateTicketToken } from "@/lib/ticketToken"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Sparkles, 
  ArrowLeft, 
  Search, 
  Download, 
  MessageCircle, 
  ShieldCheck, 
  Users, 
  Info
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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

  // Animasi acak kelompok (The Sorting Hat)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSorting) {
      interval = setInterval(() => {
        setDisplayedGroupIndex((prev) => (prev + 1) % ALL_KELOMPOK.length)
      }, 90)
    }
    return () => clearInterval(interval)
  }, [isSorting])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNim = nim.trim()

    if (!cleanNim) {
      toast.error("Silakan masukkan NIM Anda")
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
        toast.error(`NIM "${cleanNim}" tidak ditemukan dalam daftar peserta. Silakan hubungi Sie Acara/Komdis.`)
        setIsLoading(false)
        return
      }

      // Mulai efek animasi acak kelompok dramatis (2.4 detik)
      setIsSorting(true)
      setTimeout(async () => {
        setIsSorting(false)
        setMember(data)
        const token = generateTicketToken(data.nim)
        setTicketToken(token)
        setIsLoading(false)

        // Catat waktu klaim ke Supabase
        try {
          await supabase
            .from("members")
            .update({ ticket_claimed_at: new Date().toISOString() })
            .eq("id", data.id)
        } catch {
          // ignore
        }

        toast.success(`Selamat bergabung di ${data.kelompok || "Kelompok Anda"}!`)
      }, 2400)
    } catch {
      toast.error("Terjadi gangguan koneksi. Pastikan internet Anda aktif.")
      setIsLoading(false)
      setIsSorting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 print:p-0 print:bg-white">
      {/* Header Bar */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between pb-6 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Beranda
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TM OSPRO 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md mx-auto my-auto space-y-6">
        {!member && !isSorting && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-primary mb-1">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Klaim Tiket & Kelompok
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto">
                Masukkan NIM resmi Anda untuk mengundi kelompok dan mendapatkan Barcode ID Card OSPRO 2026.
              </p>
            </div>

            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleClaim} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                      Nomor Induk Mahasiswa (NIM)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Contoh: 25120001"
                        value={nim}
                        onChange={(e) => setNim(e.target.value)}
                        required
                        autoFocus
                        className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-2xl font-mono text-base tracking-wider transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-primary hover:bg-blue-600 font-bold text-sm shadow-sm hover:shadow transition-all active:scale-[0.98]"
                  >
                    {isLoading ? "Memeriksa Database..." : "Undi Kelompok & Dapatkan ID Card"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-start gap-3 text-amber-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-[11px] leading-relaxed font-medium">
                <strong>Catatan Penting:</strong> Barcode yang Anda dapatkan berlaku untuk seluruh Sesi OSPRO. Wajib disimpan/screenshot saat ini juga.
              </p>
            </div>
          </div>
        )}

        {/* Sorting Animation Stage */}
        {isSorting && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                Sedang Mengundi Kelompok Anda...
              </p>
              <div className="h-12 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight transition-all duration-75">
                  {ALL_KELOMPOK[displayedGroupIndex]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Menyesuaikan formasi dan menetapkan kakak pendamping...
              </p>
            </div>
          </div>
        )}

        {/* Revealed ID Card Stage */}
        {member && !isSorting && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* The Badge Card */}
            <div 
              id="student-id-card" 
              className="bg-white rounded-3xl border-2 border-slate-900 shadow-xl overflow-hidden p-6 sm:p-7 text-center relative space-y-5"
            >
              {/* Badge Ribbon */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-primary" />

              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> OSPRO HIMASI 2026
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {member.name}
                </h2>
                <p className="text-xs font-mono font-bold text-slate-400">
                  NIM: {member.nim}
                </p>
              </div>

              {/* Group Highlight Badge */}
              <div className="py-2.5 px-4 rounded-2xl bg-blue-50 border border-blue-100/80 inline-block">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">
                  Kelompok Ditetapkan
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-900 tracking-tight">
                  {member.kelompok || "Kelompok 1"}
                </span>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm inline-block">
                  <QRCodeSVG 
                    value={ticketToken} 
                    size={170} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>
                <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
                  KODE PRESENSI RESMI
                </span>
              </div>

              {/* Mentor / Pendamping Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Pendamping Kelompok</p>
                      <p className="text-xs font-bold text-slate-800">
                        {member.pendamping || "Sie Acara / Komdis"}
                      </p>
                    </div>
                  </div>

                  {member.no_wa_pendamping && (
                    <a
                      href={`https://wa.me/${member.no_wa_pendamping.replace(/[^0-9]/g, "")}?text=Halo%20Kak,%20saya%20${encodeURIComponent(member.name)}%20dari%20${encodeURIComponent(member.kelompok || "Kelompok")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors shrink-0 shadow-sm"
                    >
                      <MessageCircle className="h-3 w-3" /> Chat WA
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 py-1.5 px-3 rounded-xl inline-block border border-amber-200/60">
                  📸 Wajib Screenshot atau Print Kartu Ini Sekarang!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 print:hidden">
              <Button
                onClick={handlePrint}
                className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" /> Cetak / Simpan PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMember(null)
                  setNim("")
                }}
                className="h-12 px-6 rounded-2xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cari NIM Lain
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-4 print:hidden">
        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          KEDIS HIMASI 2026 • The Architect
        </p>
      </footer>
    </div>
  )
}

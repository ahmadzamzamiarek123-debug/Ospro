"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Member, Violation, ViolationWithDetails } from "@/types/database"
import { getMemberStatus } from "@/lib/logic"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, CheckCircle2, User, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [member, setMember] = useState<Member | null>(null)
  const [violations, setViolations] = useState<ViolationWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function fetchData() {
      try {
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single()

        const { data: violationsData } = await supabase
          .from('violations')
          .select('*, recorded_by_user:users(name)')
          .eq('member_id', id)
          .order('created_at', { ascending: false })

        if (memberData) {
          setMember(memberData)
        }
        if (violationsData) {
          setViolations(violationsData)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="h-7 w-7 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Memuat...</p>
      </div>
    )
  }
  
  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-center p-4">
        <h1 className="text-base font-bold text-slate-900">Data Peserta Tidak Ditemukan</h1>
        <Button onClick={() => router.back()} variant="outline" size="sm" className="rounded-xl text-xs h-8">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali
        </Button>
      </div>
    )
  }

  const status = getMemberStatus(violations as unknown as Violation[])

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'baik': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'ringan': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'sedang': return 'bg-orange-50 text-orange-800 border-orange-200'
      case 'berat': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getDotColor = (type: string) => {
    switch (type) {
      case 'baik': return 'bg-emerald-500'
      case 'ringan': return 'bg-yellow-500'
      case 'sedang': return 'bg-orange-500'
      case 'berat': return 'bg-red-500'
      default: return 'bg-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-10 font-sans">
      {/* Top Navbar */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-xl mx-auto h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <img src="/logo.png" alt="OSI" className="h-6 w-6 object-contain" />
              <span className="text-sm font-black tracking-tight text-slate-900">OSI 2026</span>
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">Rincian</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()} 
            className="text-slate-600 font-semibold text-xs gap-1 h-8 px-2.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 sm:py-5 space-y-3.5 animate-in fade-in duration-150">
        {/* Profil Peserta Ringkas & Padat */}
        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                  {member.name}
                </h1>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                  {member.kelompok || "Tanpa Kelompok"}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">
                {member.nim} • <span className="uppercase text-[10px] font-semibold text-slate-400">{member.role === "panitia" ? "Panitia" : "Peserta"}</span>
              </p>
            </div>

            {/* Total Poin & Status Compact */}
            <div className="flex items-center gap-1.5 shrink-0 text-right font-mono">
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Poin</span>
                <span className={cn(
                  "text-sm sm:text-base font-black leading-none",
                  status.points >= 50 ? "text-red-600" : status.points >= 20 ? "text-orange-600" : "text-slate-900"
                )}>
                  {status.points}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Status</span>
                {status.isRedoOspro ? (
                  <span className="text-[11px] font-black text-red-600">ULANG</span>
                ) : (
                  <span className="text-[11px] font-black text-emerald-600">AMAN</span>
                )}
              </div>
            </div>
          </div>

          {/* Mini pill counters */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-mono flex-wrap">
            <span className="text-slate-400 text-[10px] font-sans mr-0.5">Rekap:</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
              +{status.counts.baik} Apresiasi
            </span>
            <span className="px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 font-bold border border-yellow-100">
              {status.counts.ringan} Ringan
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 font-bold border border-orange-100">
              {status.counts.sedang} Sedang
            </span>
            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100">
              {status.counts.berat} Berat
            </span>
          </div>

          {status.hasEscalation && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-amber-800 text-[11px] font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>Eskalasi: Terdeteksi ≥ 3 pelanggaran ringan dalam satu sesi kegiatan.</span>
            </div>
          )}
        </div>

        {/* Riwayat Kedisiplinan & Catatan Petugas (Lebih Ramping & Kompak) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Riwayat Kedisiplinan ({violations.length})</span>
            </h2>
          </div>

          {violations.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center space-y-1 shadow-2xs">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Bersih dari Catatan</p>
              <p className="text-[11px] text-slate-400">Peserta ini belum memiliki catatan pelanggaran atau apresiasi.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {violations.map((v) => {
                const dateObj = new Date(v.created_at)
                const dateFormatted = dateObj.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short'
                })
                const timeFormatted = dateObj.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) + ' WIB'

                const catatanText = v.chronology || v.notes || "(Tidak ada rincian catatan)"
                const petugasName = v.recorded_by_user?.name || "Komdis"

                return (
                  <div 
                    key={v.id} 
                    className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl p-3 shadow-2xs space-y-2 transition-colors"
                  >
                    {/* Baris 1: Kategori Badge, Sesi, Tanggal & Jam */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${getDotColor(v.violation_type)}`} />
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getBadgeStyle(v.violation_type)}`}>
                          {v.violation_category || v.violation_type.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Sesi {v.session_number}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {dateFormatted} • {timeFormatted}
                      </span>
                    </div>

                    {/* Baris 2: Isi Catatan (Ramping & langsung terbaca) */}
                    <p className="text-xs text-slate-800 font-medium leading-relaxed pl-2.5 border-l-2 border-slate-200 whitespace-pre-line">
                      {catatanText}
                    </p>

                    {/* Baris 3: Nama Akun / Petugas yang Input */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 font-mono">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>Diinput: <strong className="text-slate-700 font-semibold">{petugasName}</strong></span>
                      </div>
                      <span className="text-slate-400">Pukul {timeFormatted}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Member, Violation, ViolationWithDetails } from "@/types/database"
import { getMemberStatus } from "@/lib/logic"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
        <div className="h-8 w-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Memuat Rincian...</p>
      </div>
    )
  }
  
  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-center p-4">
        <h1 className="text-lg font-bold text-slate-900">Data Peserta Tidak Ditemukan</h1>
        <Button onClick={() => router.back()} variant="outline" size="sm" className="rounded-xl text-xs">
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
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-12 font-sans">
      {/* Top Navbar */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="OSI" className="h-6 w-6 object-contain" />
              <span className="text-sm font-black tracking-tight text-slate-900">OSI 2026</span>
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">Rincian Kedisiplinan</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()} 
            className="text-slate-600 font-semibold text-xs gap-1.5 h-8 px-2.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-in fade-in duration-200">
        {/* Profil Peserta Ringkas (Tanpa Icon Manusia Besar Sesuai Permintaan) */}
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {member.name}
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {member.kelompok || "Tanpa Kelompok"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>NIM: <strong className="text-slate-800">{member.nim}</strong></span>
                <span>•</span>
                <span className="uppercase text-[11px] font-semibold text-slate-400">
                  {member.role === "panitia" ? "Panitia" : "Mahasiswa Baru"}
                </span>
              </div>
            </div>

            {/* Status Poin & Status Kelulusan */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Total Poin</span>
                <span className={cn(
                  "text-xl font-black font-mono leading-none",
                  status.points >= 50 ? "text-red-600" : status.points >= 20 ? "text-orange-600" : "text-slate-900"
                )}>
                  {status.points}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Status</span>
                {status.isRedoOspro ? (
                  <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md inline-block">
                    ULANG OSI
                  </span>
                ) : (
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                    AMAN
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ringkasan Total Pelanggaran & Kebaikan */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
              <span className="text-sm font-black text-emerald-700 font-mono block">{status.counts.baik}</span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Apresiasi</span>
            </div>
            <div className="p-2 rounded-xl bg-yellow-50/60 border border-yellow-100/80">
              <span className="text-sm font-black text-yellow-800 font-mono block">{status.counts.ringan}</span>
              <span className="text-[10px] font-bold text-yellow-800 uppercase">Ringan</span>
            </div>
            <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100/80">
              <span className="text-sm font-black text-orange-800 font-mono block">{status.counts.sedang}</span>
              <span className="text-[10px] font-bold text-orange-800 uppercase">Sedang</span>
            </div>
            <div className="p-2 rounded-xl bg-red-50/60 border border-red-100/80">
              <span className="text-sm font-black text-red-700 font-mono block">{status.counts.berat}</span>
              <span className="text-[10px] font-bold text-red-800 uppercase">Berat</span>
            </div>
          </div>

          {status.hasEscalation && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Eskalasi: Terdeteksi ≥ 3 pelanggaran ringan dalam satu sesi kegiatan.</span>
            </div>
          )}
        </Card>

        {/* Riwayat Kedisiplinan & Catatan Petugas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Riwayat Kedisiplinan & Catatan Komdis</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {violations.length} Catatan
            </span>
          </div>

          {violations.length === 0 ? (
            <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-8 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Belum Ada Catatan Kedisiplinan</p>
              <p className="text-xs text-slate-400">Peserta ini bersih tanpa catatan pelanggaran atau apresiasi.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {violations.map((v) => {
                const dateObj = new Date(v.created_at)
                const dateFormatted = dateObj.toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
                const timeFormatted = dateObj.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) + ' WIB'

                const catatanText = v.chronology || v.notes || "(Tidak ada rincian catatan tambahan)"
                const petugasName = v.recorded_by_user?.name || "Petugas Komdis"

                return (
                  <Card key={v.id} className="border border-slate-200/80 shadow-xs rounded-2xl bg-white p-4 sm:p-5 space-y-3">
                    {/* Header Item: Kategori & Waktu */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${getDotColor(v.violation_type)}`} />
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${getBadgeStyle(v.violation_type)}`}>
                          {v.violation_category || v.violation_type.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Sesi {v.session_number}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-600">{timeFormatted}</span>
                      </div>
                    </div>

                    {/* Isi Catatan Kedisiplinan */}
                    <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 text-xs text-slate-800 leading-relaxed">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Catatan Kejadian:
                      </span>
                      <p className="font-medium whitespace-pre-line">{catatanText}</p>
                    </div>

                    {/* Footer Item: Nama Akun / Petugas yang Input */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100/80 font-mono">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>Diinput oleh: <strong className="text-slate-800">{petugasName}</strong></span>
                      </div>
                      <span className="text-slate-400">{timeFormatted}</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

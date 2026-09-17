"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Member, Violation, ViolationWithDetails } from "@/types/database"
import { getMemberStatus } from "@/lib/logic"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, UserCircle, ShieldAlert, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DUMMY_MEMBERS, DUMMY_VIOLATIONS } from "@/lib/mockData"

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const initialMember = DUMMY_MEMBERS.find(m => m.id === id) || null
  const initialViolations = DUMMY_VIOLATIONS.filter(v => v.member_id === id)

  const [member, setMember] = useState<Member | null>(() => initialMember)
  const [violations, setViolations] = useState<ViolationWithDetails[]>(() => initialViolations)
  const [loading, setLoading] = useState(() => !initialMember)

  useEffect(() => {
    const supabase = createClient()
    async function fetchData() {
      try {
        const memberQuery = supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single()

        const violationsQuery = supabase
          .from('violations')
          .select('*, recorded_by_user:users(name)')
          .eq('member_id', id)
          .order('created_at', { ascending: false })

        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200))

        const res = await Promise.race([
          Promise.all([memberQuery, violationsQuery]),
          timeout
        ]) as [{ data: Member | null }, { data: ViolationWithDetails[] | null }]

        if (res && res[0]?.data) {
          setMember(res[0].data)
        }
        if (res && res[1]?.data && res[1].data.length > 0) {
          setViolations(res[1].data)
        }
      } catch {
        // Gunakan fallback data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat...</p>
    </div>
  )
  
  if (!member) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-bold text-slate-900">Tidak Ditemukan</h1>
      <Button onClick={() => router.push('/')} variant="outline" size="sm" className="rounded-xl">
        Kembali
      </Button>
    </div>
  )

  const status = getMemberStatus(violations as unknown as Violation[])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">KEDIS<span className="text-primary">.</span></Link>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500 font-bold gap-1 text-xs px-2">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-12 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-5 space-y-6">
            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
              <CardContent className="p-5 sm:p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 shrink-0">
                    <UserCircle className="h-12 w-12 sm:h-16 sm:w-16" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider">{member.role}</Badge>
                      {member.kelompok && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {member.kelompok}
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate max-w-[280px]">{member.name}</h1>
                    <p className="text-sm font-mono text-slate-400">{member.nim}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full pt-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-black text-slate-400">Total Poin</span>
                      <span className={cn(
                        "text-2xl sm:text-3xl font-black",
                        status.points >= 50 ? "text-red-600" : status.points >= 20 ? "text-orange-600" : "text-slate-900"
                      )}>{status.points}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-black text-slate-400">Status</span>
                      {status.isRedoOspro ? (
                        <Badge variant="destructive" className="font-black">ULANG</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-600 border-none font-black">AMAN</Badge>
                      )}
                    </div>
                  </div>

                  {status.hasEscalation && (
                    <div className="w-full bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 text-orange-700">
                      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-left leading-tight">Eskalasi: Terdeteksi ≥ 3 pelanggaran ringan dalam satu sesi.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white p-5 sm:p-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ringkasan</h3>
              <div className="grid grid-cols-4 gap-2">
                <MiniStat label="Baik" value={status.counts.baik} color="green" />
                <MiniStat label="Ringan" value={status.counts.ringan} color="yellow" />
                <MiniStat label="Sedang" value={status.counts.sedang} color="orange" />
                <MiniStat label="Berat" value={status.counts.berat} color="red" />
              </div>
            </Card>
          </div>

          <div className="md:col-span-7 space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Riwayat Kedisiplinan
            </h2>
            
            <div className="space-y-4">
              {violations.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                  <p className="text-slate-400 font-bold italic text-sm">Belum ada catatan kedisiplinan.</p>
                </div>
              ) : (
                violations.map((v) => (
                  <div key={v.id} className="relative pl-8 sm:pl-10 before:absolute before:left-4 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 last:before:hidden">
                    <div className={cn(
                      "absolute left-2.5 top-2 h-3.5 w-3.5 rounded-full border-4 border-white shadow-sm z-10",
                      getSeverityColor(v.violation_type)
                    )}></div>

                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden mb-4 bg-white">
                      <CardContent className="p-4 sm:p-5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-400">Sesi {v.session_number} • {new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          <div className="flex items-center gap-1.5">
                            {v.status && (
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                v.status === 'selesai' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              )}>
                                {v.status}
                              </span>
                            )}
                            <Badge className={cn("text-[9px] font-black h-4 px-1.5 border uppercase", getBadgeColor(v.violation_type))}>
                              {v.violation_type}
                            </Badge>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{v.violation_category}</h4>
                        {v.consequence && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-400 text-[10px] uppercase block mb-0.5">Konsekuensi SOP</span>
                            {v.consequence}
                          </div>
                        )}
                        {v.notes && <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2 rounded-lg">&ldquo;{v.notes}&rdquo;</p>}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-50 text-[9px] text-slate-300 font-medium">
                          <span className="truncate max-w-[150px]">Oleh: {v.recorded_by_user?.name || 'Sistem'}</span>
                          <span>{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: Record<string, string> = {
    green: 'text-emerald-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  }
  return (
    <div className="bg-slate-50 p-2 rounded-xl text-center flex flex-col">
      <span className="text-base font-black text-slate-900">{value}</span>
      <span className={cn("text-[9px] sm:text-[10px] font-bold uppercase", colors[color])}>{label}</span>
    </div>
  )
}

function getSeverityColor(type: string) {
  switch (type) {
    case 'berat': return 'bg-red-500'
    case 'sedang': return 'bg-orange-500'
    case 'ringan': return 'bg-yellow-500'
    default: return 'bg-emerald-500'
  }
}

function getBadgeColor(type: string) {
  switch (type) {
    case 'berat': return 'bg-red-50 text-red-600 border-red-100'
    case 'sedang': return 'bg-orange-50 text-orange-600 border-orange-100'
    case 'ringan': return 'bg-yellow-50 text-yellow-600 border-yellow-100'
    default: return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }
}

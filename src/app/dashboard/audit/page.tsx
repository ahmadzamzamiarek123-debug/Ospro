"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ViolationWithDetails } from "@/types/database"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChevronLeft, User, Calendar, CheckCircle2, Clock, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
export default function AuditTrailPage() {
  const [violations, setViolations] = useState<ViolationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchAudit = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('violations')
        .select('*, member:members(name, nim, kelompok), recorder:users(name)')
        .order('created_at', { ascending: false })
      
      setViolations((data as unknown as ViolationWithDetails[]) || [])
    } catch {
      setViolations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudit()
  }, [])

  const handleToggleStatus = async (id: string, currentStatus: string | undefined) => {
    const nextStatus = currentStatus === 'selesai' ? 'pending' : 'selesai'
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('violations')
        .update({ status: nextStatus })
        .eq('id', id)

      if (error) throw error

      setViolations(prev => prev.map(v => v.id === id ? { ...v, status: nextStatus as 'pending' | 'selesai' } : v))
      toast.success(nextStatus === 'selesai' ? "Sanksi ditandai selesai" : "Sanksi dikembalikan ke pending")
    } catch {
      toast.error("Gagal memperbarui status sanksi")
    }
  }

  const getViolationColor = (type: string) => {
    switch (type) {
      case 'berat': return 'bg-red-50 text-red-600 border-red-100'
      case 'sedang': return 'bg-orange-50 text-orange-600 border-orange-100'
      case 'ringan': return 'bg-yellow-50 text-yellow-600 border-yellow-100'
      default: return 'bg-green-50 text-green-600 border-green-100'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 sm:px-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full border border-slate-200">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Log Administrasi Komdis</h1>
            <p className="text-xs text-slate-400 font-medium">Riwayat sanksi, konsekuensi SOP, dan status penyelesaian.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b-slate-100 hover:bg-transparent">
                <TableHead className="min-w-[120px] sm:min-w-[150px] font-bold text-slate-500 px-3 sm:px-6 h-12 text-xs uppercase">Waktu</TableHead>
                <TableHead className="font-bold text-slate-500 h-12 text-xs uppercase">Peserta & Kasus</TableHead>
                <TableHead className="min-w-[160px] font-bold text-slate-500 h-12 text-xs uppercase">Konsekuensi SOP</TableHead>
                <TableHead className="min-w-[100px] font-bold text-slate-500 h-12 text-xs uppercase text-center">Status</TableHead>
                <TableHead className="min-w-[100px] font-bold text-slate-500 px-3 sm:px-6 h-12 text-xs uppercase">Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">Belum ada data pencatatan.</TableCell>
                </TableRow>
              ) : (
                violations.map((v) => (
                  <TableRow key={v.id} className="border-b-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-3 sm:px-6 py-4 align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-black text-slate-300 uppercase">Sesi {v.session_number}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-top">
                      <div className="flex flex-col gap-1.5 max-w-[240px] sm:max-w-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{v.member?.name}</span>
                          {v.member?.kelompok && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {v.member.kelompok}
                            </span>
                          )}
                          <Badge className={cn("text-[10px] font-black h-4 px-1.5 border uppercase", getViolationColor(v.violation_type))}>
                            {v.violation_type}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {v.violation_category}
                        </p>
                        {v.chronology && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-normal">
                            &ldquo;{v.chronology}&rdquo;
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-top">
                      {v.consequence ? (
                        <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100/80">
                          <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span>{v.consequence}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4 align-top text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(v.id, v.status)}
                        className={cn(
                          "h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                          v.status === 'selesai'
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        )}
                      >
                        {v.status === 'selesai' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Selesai
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </Button>
                    </TableCell>

                    <TableCell className="px-3 sm:px-6 py-4 align-top">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-7 w-7 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[80px] sm:max-w-none">{v.recorder?.name || 'Sistem'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

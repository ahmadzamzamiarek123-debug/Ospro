"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member, Violation, MemberWithPoints } from "@/types/database"
import { getMemberStatus } from "@/lib/logic"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, AlertTriangle, Shield, ArrowLeft, Maximize, Minimize, RotateCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function ProyektorPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [search, setSearch] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    const supabase = createClient()
    try {
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .eq('role', 'peserta')
        .order('name', { ascending: true })

      const { data: violationsData } = await supabase
        .from('violations')
        .select('*')
      
      setMembers(membersData || [])
      setViolations(violationsData || [])
    } catch {
      setMembers([])
      setViolations([])
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel('proyektor:violations')
      .on('postgres_changes', { event: '*', table: 'violations', schema: 'public' }, () => {
        fetchData()
      })
      .subscribe()

    const interval = setInterval(fetchData, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchData])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const processedMembers: MemberWithPoints[] = members
    .map(m => {
      const memberViolations = violations.filter(v => v.member_id === m.id)
      const status = getMemberStatus(memberViolations)
      return {
        ...m,
        points: status.points,
        violations_count: status.counts,
        has_escalation: status.hasEscalation,
        is_redo_ospro: status.isRedoOspro
      }
    })
    .filter(m => 
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.nim.toLowerCase().includes(search.toLowerCase()) ||
      (m.kelompok && m.kelompok.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b.points - a.points)

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="w-full max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="OSI" className="h-7 w-7 object-contain" />
              <h1 className="text-base font-black tracking-tight text-slate-900">
                OSI 2026
              </h1>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
                Layar Proyektor Aula
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Perbarui Data"
            >
              <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5 mr-1" /> : <Maximize className="h-3.5 w-3.5 mr-1" />}
              {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Leaderboard Kedisiplinan
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Monitoring kedisiplinan dan poin apresiasi peserta OSI secara real-time.
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari Nama, NIM, atau Kelompok..."
                className="w-full pl-10 h-10 bg-white border-slate-200 rounded-xl shadow-xs text-xs font-medium focus-visible:ring-slate-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
              <span>{processedMembers.length} Peserta Terdaftar</span>
              <span className="text-[11px] text-slate-400">Diurutkan berdasarkan poin</span>
            </div>

            {/* List Peserta */}
            <LeaderboardContent members={processedMembers} />
          </div>
        </div>
      </main>
    </div>
  )
}

function LeaderboardContent({ members }: { members: MemberWithPoints[] }) {
  if (members.length === 0) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <p className="text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
        Tidak ada data peserta ditemukan
      </p>
    </div>
  )

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Mobile View: Compact Card List (< 1024px) */}
      <div className="flex flex-col gap-2 lg:hidden w-full">
        {members.map((m) => (
          <Card key={m.id} className="w-full border-slate-200/80 shadow-xs rounded-xl bg-white">
            <CardContent className="p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="overflow-hidden space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm leading-tight truncate">{m.name}</span>
                    {m.is_redo_ospro && (
                      <Badge variant="destructive" className="text-[8px] h-3.5 px-1 bg-red-500 border-none font-black uppercase tracking-tighter shrink-0">
                        ULANG OSI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-slate-400">{m.nim}</span>
                    {m.kelompok && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {m.kelompok}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 shrink-0 ml-2">
                  <span className={cn(
                    "text-xl font-black leading-none tracking-tight font-mono",
                    m.points >= 50 ? "text-red-600" : m.points >= 20 ? "text-orange-600" : "text-slate-900"
                  )}>
                    {m.points}
                  </span>
                  <span className="text-[9px] font-bold uppercase text-slate-400 font-mono">Poin</span>
                </div>
              </div>

              {/* Badges Baik Buruk */}
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 overflow-x-auto">
                <MiniStat value={m.violations_count.baik} color="green" label="Baik" />
                <MiniStat value={m.violations_count.ringan} color="yellow" label="Ringan" />
                <MiniStat value={m.violations_count.sedang} color="orange" label="Sedang" />
                <MiniStat value={m.violations_count.berat} color="red" label="Berat" />
                {m.has_escalation && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 uppercase ml-auto shrink-0">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    <span>Eskalasi</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop View: Clean Minimalist Table (>= 1024px) */}
      <div className="hidden lg:block w-full border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/60">
            <TableRow className="border-b-slate-100 hover:bg-transparent h-11">
              <TableHead className="font-bold text-slate-500 px-6 h-11 text-[11px] uppercase tracking-wider">
                Nama Peserta
              </TableHead>
              <TableHead className="font-bold text-slate-500 text-[11px] uppercase tracking-wider px-4">
                NIM
              </TableHead>
              <TableHead className="font-bold text-slate-500 text-[11px] uppercase tracking-wider px-4">
                Kelompok
              </TableHead>
              <TableHead className="text-center font-bold text-slate-500 text-[11px] uppercase tracking-wider px-4">
                Keterangan Kedisiplinan
              </TableHead>
              <TableHead className="text-right font-bold text-slate-500 px-6 h-11 text-[11px] uppercase tracking-wider">
                Poin
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className="border-b-slate-100 hover:bg-slate-50/50 transition-colors h-14">
                <TableCell className="px-6 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">{m.name}</span>
                    {m.is_redo_ospro && (
                      <Badge variant="destructive" className="text-[8px] h-4 px-1.5 bg-red-500 border-none font-black uppercase tracking-tighter">
                        ULANG OSI
                      </Badge>
                    )}
                    {m.has_escalation && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase" title="Eskalasi Komdis">
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 font-mono text-xs text-slate-500 px-4 font-semibold">
                  {m.nim}
                </TableCell>
                <TableCell className="py-2.5 px-4">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {m.kelompok || 'Kelompok 1'}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-4">
                  <div className="flex justify-center items-center gap-2">
                    <StatBadge value={m.violations_count.baik} color="green" label="Baik" />
                    <StatBadge value={m.violations_count.ringan} color="yellow" label="Ringan" />
                    <StatBadge value={m.violations_count.sedang} color="orange" label="Sedang" />
                    <StatBadge value={m.violations_count.berat} color="red" label="Berat" />
                  </div>
                </TableCell>
                <TableCell className="px-6 py-2.5 text-right font-mono">
                  <span className={cn(
                    "font-black text-lg tracking-tight",
                    m.points >= 50 ? "text-red-600" : m.points >= 20 ? "text-orange-600" : "text-slate-900"
                  )}>
                    {m.points}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MiniStat({ value, color, label }: { value: number; color: string; label: string }) {
  const dots: Record<string, string> = {
    green: "🟢",
    yellow: "🟡",
    orange: "🟠",
    red: "🔴",
  }
  return (
    <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
      <span className="text-[9px] shrink-0">{dots[color]}</span>
      <span className="text-[9px] font-medium text-slate-700">{label}</span>
      <span className="text-[10px] font-bold text-slate-900 ml-0.5 font-mono">{value}</span>
    </div>
  )
}

function StatBadge({ value, color, label }: { value: number; color: 'green' | 'yellow' | 'orange' | 'red'; label: string }) {
  const colors = {
    green: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
    yellow: 'text-amber-800 bg-amber-50 border-amber-200/60',
    orange: 'text-orange-800 bg-orange-50 border-orange-200/60',
    red: 'text-red-800 bg-red-50 border-red-200/60',
  }
  const dots = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs", colors[color])}>
      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", dots[color])} />
      <span className="text-[11px] font-medium">{label}</span>
      <span className="text-xs font-bold font-mono ml-0.5">{value}</span>
    </div>
  )
}

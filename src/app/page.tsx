"use client"

import { useState, useEffect } from "react"
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
import { Search, AlertTriangle, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function PublicLeaderboard() {
  const [members, setMembers] = useState<Member[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
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
      }
    }

    fetchData()

    const channel = supabase
      .channel('public:violations')
      .on('postgres_changes', { event: '*', table: 'violations', schema: 'public' }, () => {
        fetchData()
      })
      .subscribe()

    const interval = setInterval(fetchData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

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
    <div className="min-h-screen bg-slate-50/30 overflow-x-hidden">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="w-full max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tighter">KEDIS<span className="text-primary">.</span></h1>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
              OSPRO HIMASI 2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tiket">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50">
                Tiket Peserta
              </Button>
            </Link>
            <Link href="/masuk">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900">
                Panitia
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Leaderboard Kedisiplinan</h2>
            </div>
            <p className="text-sm font-semibold text-slate-400">
              Monitoring kedisiplinan dan poin apresiasi peserta OSPRO secara real-time.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Search Bar - Modern & Minimal */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari Nama, NIM, atau Kelompok..."
                className="w-full pl-10 h-11 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-primary/10 transition-all text-sm font-medium border-none ring-1 ring-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>{processedMembers.length} Peserta Terdaftar</span>
              <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">Diurutkan berdasarkan poin pelanggaran</span>
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
    <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <p className="text-center text-slate-400 font-black italic text-sm tracking-widest uppercase opacity-60">Belum ada data peserta</p>
    </div>
  )

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Mobile View: Compact Horizontal List (< 1024px) */}
      <div className="flex flex-col gap-2 lg:hidden w-full">
        {members.map((m) => (
          <Link href={`/member/${m.id}`} key={m.id} className="w-full">
            <Card className="w-full border-slate-100 shadow-sm rounded-xl overflow-hidden active:scale-[0.99] transition-all bg-white hover:bg-slate-50/70">
              <CardContent className="p-2.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm leading-tight truncate">{m.name}</span>
                      {m.is_redo_ospro && (
                        <Badge variant="destructive" className="text-[8px] h-3.5 px-1 bg-red-500 border-none font-black uppercase tracking-tighter shrink-0">ULANG</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">{m.nim}</span>
                      {m.kelompok && (
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                          {m.kelompok}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 shrink-0 ml-2">
                    <span className={cn(
                      "text-xl font-black leading-none tracking-tighter",
                      m.points >= 50 ? "text-red-600" : m.points >= 20 ? "text-orange-600" : "text-slate-900"
                    )}>{m.points}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Poin</span>
                  </div>
                </div>

                {/* Single Compact Horizontal Row for Stickers */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100/80 overflow-x-auto">
                  <MiniStat value={m.violations_count.baik} color="green" label="Baik" />
                  <MiniStat value={m.violations_count.ringan} color="yellow" label="Ringan" />
                  <MiniStat value={m.violations_count.sedang} color="orange" label="Sedang" />
                  <MiniStat value={m.violations_count.berat} color="red" label="Berat" />
                  {m.has_escalation && (
                    <div className="flex items-center gap-1 text-[8px] font-bold text-orange-600 uppercase ml-auto shrink-0">
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      <span>Eskalasi</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Desktop View: Professional Table (>= 1024px) */}
      <div className="hidden lg:block w-full border border-slate-200/40 rounded-3xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/40">
            <TableRow className="border-b-slate-100 hover:bg-transparent h-12">
              <TableHead className="font-black text-slate-500 px-8 h-12 text-[9px] uppercase tracking-[0.2em]">Nama Peserta</TableHead>
              <TableHead className="font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-4">NIM</TableHead>
              <TableHead className="font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-4">Kelompok</TableHead>
              <TableHead className="text-center font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-4">Kedisiplinan</TableHead>
              <TableHead className="text-right font-black text-slate-500 px-8 h-12 text-[9px] uppercase tracking-[0.2em]">Poin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className="group border-b-slate-50 hover:bg-slate-50/50 transition-colors h-16">
                <TableCell className="px-8 py-3">
                  <Link href={`/member/${m.id}`} className="block">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm tracking-tight">{m.name}</span>
                      {m.is_redo_ospro && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5 bg-red-500 border-none font-black uppercase tracking-tighter">ULANG</Badge>
                      )}
                      {m.has_escalation && (
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase">
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="py-3 font-mono text-xs text-slate-400 px-4 font-bold">
                  {m.nim}
                </TableCell>
                <TableCell className="py-3 px-4">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-lg">
                    {m.kelompok || 'Kelompok 1'}
                  </span>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <div className="flex justify-center items-center gap-3">
                    <StatBadge value={m.violations_count.baik} color="green" label="Baik" />
                    <StatBadge value={m.violations_count.ringan} color="yellow" label="Ringan" />
                    <StatBadge value={m.violations_count.sedang} color="orange" label="Sedang" />
                    <StatBadge value={m.violations_count.berat} color="red" label="Berat" />
                  </div>
                </TableCell>
                <TableCell className="px-8 py-3 text-right">
                  <span className={cn(
                    "font-black text-xl tracking-tighter",
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

function MiniStat({ value, color, label }: { value: number, color: string, label: string }) {
  const dots: Record<string, string> = {
    green: "🟢",
    yellow: "🟡",
    orange: "🟠",
    red: "🔴",
  }
  return (
    <div className="flex items-center gap-1 bg-slate-50/80 px-2 py-0.5 rounded-md border border-slate-200/50 shrink-0">
      <span className="text-[9px] shrink-0">{dots[color]}</span>
      <span className="text-[9px] font-semibold text-slate-800">{label}</span>
      <span className="text-[10px] font-black text-slate-950 ml-0.5">{value}</span>
    </div>
  )
}

function StatBadge({ value, color, label }: { value: number, color: 'green' | 'yellow' | 'orange' | 'red', label: string }) {
  const colors = {
    green: 'text-green-800 bg-green-50/70 border-green-200/60',
    yellow: 'text-yellow-900 bg-yellow-50/70 border-yellow-200/60',
    orange: 'text-orange-900 bg-orange-50/70 border-orange-200/60',
    red: 'text-red-800 bg-red-50/70 border-red-200/60',
  }
  const dots = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-600',
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all shadow-xs", colors[color])}>
      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", dots[color])} />
      <span className="text-[11px] font-semibold text-slate-900">{label}</span>
      <span className="text-xs font-black text-slate-950 ml-0.5">{value}</span>
    </div>
  )
}

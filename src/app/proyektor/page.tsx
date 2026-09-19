"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member, Violation, MemberWithPoints } from "@/types/database"
import { getMemberStatus } from "@/lib/logic"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Maximize, 
  Minimize, 
  ArrowLeft, 
  RotateCw,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default function ProyektorPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [search, setSearch] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filterType, setFilterType] = useState<"semua" | "pelanggar" | "apresiasi">("semua")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    const supabase = createClient()
    try {
      const { data: membersData } = await supabase
        .from("members")
        .select("*")
        .eq("role", "peserta")
        .order("name", { ascending: true })

      const { data: violationsData } = await supabase
        .from("violations")
        .select("*")

      setMembers(membersData || [])
      setViolations(violationsData || [])
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel("proyektor:violations")
      .on("postgres_changes", { event: "*", table: "violations", schema: "public" }, () => {
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
    .map((m) => {
      const memberViolations = violations.filter((v) => v.member_id === m.id)
      const status = getMemberStatus(memberViolations)
      return {
        ...m,
        points: status.points,
        violations_count: status.counts,
        has_escalation: status.hasEscalation,
        is_redo_ospro: status.isRedoOspro
      }
    })
    .filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.nim.toLowerCase().includes(search.toLowerCase()) ||
        (m.kelompok && m.kelompok.toLowerCase().includes(search.toLowerCase()))

      if (!matchSearch) return false

      if (filterType === "pelanggar") {
        return m.points > 0
      }
      if (filterType === "apresiasi") {
        return m.violations_count.baik > 0
      }
      return true
    })
    .sort((a, b) => b.points - a.points)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header Bar untuk Proyektor */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>EVALUASI KEDISIPLINAN</span>
                <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  OSPRO 2026
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-800 transition-colors font-mono"
              title="Refresh data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <Button
              onClick={toggleFullscreen}
              size="sm"
              variant="outline"
              className="h-8 px-3 rounded-lg border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5 mr-1" /> : <Maximize className="h-3.5 w-3.5 mr-1" />}
              {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Table Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Cari Nama, NIM, atau Kelompok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-slate-900 border-slate-800 text-white rounded-xl text-xs placeholder:text-slate-500 focus-visible:ring-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setFilterType("semua")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === "semua" ? "bg-white text-slate-950 font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Semua ({members.length})
            </button>
            <button
              onClick={() => setFilterType("pelanggar")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === "pelanggar" ? "bg-red-500 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Ada Pelanggaran
            </button>
            <button
              onClick={() => setFilterType("apresiasi")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === "apresiasi" ? "bg-emerald-500 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Apresiasi
            </button>
          </div>
        </div>

        {/* Table Container dengan Legibilitas Tinggi untuk Layar Proyektor */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Mahasiswa</th>
                  <th className="py-3 px-4 font-mono">NIM</th>
                  <th className="py-3 px-4">Kelompok</th>
                  <th className="py-3 px-4 text-center">Rincian Pelanggaran</th>
                  <th className="py-3 px-6 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {processedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                      Tidak ada data yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  processedMembers.map((m, idx) => (
                    <tr 
                      key={m.id} 
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{m.name}</span>
                          {m.is_redo_ospro && (
                            <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-red-600 text-white">
                              ULANG
                            </span>
                          )}
                          {m.has_escalation && (
                            <span className="text-[9px] font-bold text-orange-400 inline-flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" /> Eskalasi
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400 font-semibold">
                        {m.nim}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {m.kelompok || "Kelompok 1"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2 text-xs font-mono">
                          <span className="text-emerald-400" title="Apresiasi Baik">
                            🟢 {m.violations_count.baik}
                          </span>
                          <span className="text-yellow-400" title="Pelanggaran Ringan">
                            🟡 {m.violations_count.ringan}
                          </span>
                          <span className="text-orange-400" title="Pelanggaran Sedang">
                            🟠 {m.violations_count.sedang}
                          </span>
                          <span className="text-red-400" title="Pelanggaran Berat">
                            🔴 {m.violations_count.berat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span
                          className={cn(
                            "font-mono font-black text-lg",
                            m.points >= 50
                              ? "text-red-400"
                              : m.points >= 20
                              ? "text-orange-400"
                              : m.points > 0
                              ? "text-yellow-400"
                              : "text-slate-400"
                          )}
                        >
                          {m.points}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer Proyektor */}
      <footer className="border-t border-slate-900 py-3 text-center text-slate-600 text-[10px] font-mono">
        Layar Evaluasi Proyektor Aula • KEDIS HIMASI 2026
      </footer>
    </div>
  )
}

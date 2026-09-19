"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Member, Session, User } from "@/types/database"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, UserCircle, Users, Award, Calendar, LogOut, ShieldCheck, Camera, QrCode, Ticket, ExternalLink, Monitor } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ViolationSheet } from "@/components/dashboard/violation-sheet"
import { AddMemberDialog } from "@/components/dashboard/add-member-dialog"
import { AddOfficerDialog } from "@/components/dashboard/add-officer-dialog"

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [officers, setOfficers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>("viewer")
  const router = useRouter()

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    // Ambil data user login supabase auth
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, nim')
          .eq('id', user.id)
          .single()
        if (profile) setCurrentUserRole(profile.role)
        if (user.email?.startsWith('admin') || profile?.nim === 'admin' || profile?.role === 'admin') {
          setCurrentUserRole('admin')
        }
      }
    } catch {
      // ignore
    }

    // Ambil data members
    try {
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true })
      
      setMembers(membersData || [])
    } catch {
      setMembers([])
    }

    // Ambil data officers jika admin
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      setOfficers((usersData as User[]) || [])
    } catch {
      setOfficers([])
    }

    // Sesi aktif
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', today)
        .single()

      if (sessionData) {
        setActiveSession(sessionData)
      } else {
        const { data: firstActive } = await supabase
          .from('sessions')
          .select('*')
          .eq('is_active', true)
          .order('session_number', { ascending: true })
          .limit(1)
          .single()
        setActiveSession(firstActive || null)
      }
    } catch {
      setActiveSession(null)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.nim.toLowerCase().includes(search.toLowerCase()) ||
    (m.kelompok && m.kelompok.toLowerCase().includes(search.toLowerCase()))
  )

  const panitia = filteredMembers.filter(m => m.role === 'panitia')
  const peserta = filteredMembers.filter(m => m.role === 'peserta')
  const isAdmin = currentUserRole === 'admin'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/masuk")
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Peserta" value={members.filter(m => m.role === 'peserta').length} icon={<Users className="h-4 w-4" />} color="orange" />
        <StatCard title="Panitia" value={members.filter(m => m.role === 'panitia').length} icon={<Award className="h-4 w-4" />} color="blue" />
        <StatCard title="Sesi" value={activeSession?.session_number || "-"} icon={<Calendar className="h-4 w-4" />} color="green" />
        <StatCard 
          title="Keluar" 
          value="Log Out" 
          icon={<LogOut className="h-4 w-4" />} 
          color="red" 
          isAction 
          onClick={handleLogout} 
        />
      </section>

      {/* Quick Action Presensi & Layar Modes */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/presensi/scanner" className="block">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="h-4 w-4 text-slate-700" />
              <p className="font-bold text-xs sm:text-sm text-slate-900">Scanner HP</p>
            </div>
            <p className="text-[11px] text-slate-500">Scan barcode tiket maba</p>
          </div>
        </Link>

        <Link href="/presensi/layar" target="_blank" className="block">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-slate-700" />
                <p className="font-bold text-xs sm:text-sm text-slate-900">Layar Meja</p>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Barcode meja registrasi</p>
          </div>
        </Link>

        <Link href="/proyektor" target="_blank" className="block">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-slate-700" />
                <p className="font-bold text-xs sm:text-sm text-slate-900">Proyektor</p>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Layar evaluasi aula depan</p>
          </div>
        </Link>

        <Link href="/tiket" target="_blank" className="block">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-slate-700" />
                <p className="font-bold text-xs sm:text-sm text-slate-900">Tiket Maba</p>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Link klaim tiket peserta</p>
          </div>
        </Link>
      </section>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black">Panel Kedisiplinan</CardTitle>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isAdmin ? "Super Admin Mode • Kelola Peserta & Petugas" : "Petugas Komdis Mode"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <AddOfficerDialog onOfficerAdded={fetchData} />}
              {isAdmin && <AddMemberDialog onMemberAdded={fetchData} />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <Input
                placeholder="Cari Nama, NIM, atau Kelompok..."
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="peserta" className="w-full">
            <div className="px-4 sm:px-6 py-3 border-b border-slate-50 flex flex-wrap items-center justify-between gap-2">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="peserta" className="rounded-lg px-4 sm:px-6 h-8 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Peserta</TabsTrigger>
                <TabsTrigger value="panitia" className="rounded-lg px-4 sm:px-6 h-8 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Panitia (Internal)</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="petugas" className="rounded-lg px-4 sm:px-6 h-8 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                    Petugas ({officers.length})
                  </TabsTrigger>
                )}
              </TabsList>
              <span className="hidden sm:inline text-xs font-bold text-slate-400">{filteredMembers.length} Hasil</span>
            </div>
            
            <div className="p-4 sm:p-6 min-h-[400px]">
              <TabsContent value="peserta" className="m-0">
                {peserta.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-semibold">Tidak ada peserta ditemukan</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {peserta.map(m => (
                      <MemberCard key={m.id} member={m} session={activeSession} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="panitia" className="m-0">
                {panitia.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-semibold">Tidak ada panitia ditemukan</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {panitia.map(m => (
                      <MemberCard key={m.id} member={m} session={activeSession} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {isAdmin && (
                <TabsContent value="petugas" className="m-0">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Akun Petugas Komdis Terdaftar</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {officers.map(o => (
                        <div key={o.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-slate-900 text-sm truncate">{o.name}</p>
                              <p className="text-xs text-slate-500 font-mono flex items-center gap-1 truncate">
                                NIM: {o.nim || o.email?.split('@')[0]}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {o.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon, color, isAction, onClick }: { title: string, value: string | number, icon: React.ReactNode, color: string, isAction?: boolean, onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-500',
    orange: 'bg-orange-50 text-orange-500',
    green: 'bg-emerald-50 text-emerald-500',
    red: 'bg-red-50 text-red-500',
  }
  
  if (isAction) {
    return (
      <button 
        onClick={onClick}
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:bg-red-50 hover:border-red-100 transition-all group active:scale-95 text-left"
      >
        <div className={`w-fit p-2 rounded-lg ${colorMap[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
        <div className="mt-3">
          <p className="text-xl font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">{value}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className={`w-fit p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      <div className="mt-3">
        <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
    </div>
  )
}

function MemberCard({ member, session }: { member: Member, session: Session | null }) {
  return (
    <div className="group bg-white p-4 rounded-xl border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all flex items-center justify-between">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
          <UserCircle className="h-6 w-6" />
        </div>
        <div className="overflow-hidden space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-slate-900 text-sm truncate">{member.name}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-slate-400 font-mono truncate">{member.nim}</p>
            {member.kelompok && (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                {member.kelompok}
              </span>
            )}
          </div>
        </div>
      </div>
      <ViolationSheet member={member} session={session} />
    </div>
  )
}

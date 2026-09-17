import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cookieStore = cookies()
  const mockUserCookie = cookieStore.get('mock_user')?.value

  let activeUser = user
  let activeProfile: { name?: string } | null = null

  if (user) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()
      activeProfile = profile
    } catch {
      // ignore
    }
  }

  if (!activeUser && mockUserCookie) {
    try {
      const parsed = JSON.parse(mockUserCookie)
      activeUser = { id: parsed.id, email: parsed.email } as unknown as typeof user
      activeProfile = { name: parsed.name }
    } catch {
      // ignore
    }
  }

  if (!activeUser) {
    redirect("/masuk")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              KEDIS<span className="text-primary">.</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs font-bold text-slate-500 hover:text-primary transition-all">
                  Panel
                </Button>
              </Link>
              <Link href="/presensi/layar">
                <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs font-bold text-primary hover:text-blue-600 transition-all">
                  Presensi
                </Button>
              </Link>
              <Link href="/dashboard/audit">
                <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs font-bold text-slate-500 hover:text-primary transition-all">
                  Log
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-slate-900 truncate max-w-[80px] sm:max-w-none">{activeProfile?.name || 'Panitia'}</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <UserCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}

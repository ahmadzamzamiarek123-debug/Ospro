"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert, UserCheck } from "lucide-react"
import { toast } from "sonner"

export function AddOfficerDialog({ onOfficerAdded }: { onOfficerAdded?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [nim, setNim] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !nim || !password) {
      toast.error("Semua field wajib diisi")
      return
    }

    if (password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/create-officer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nim, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun")
      }

      toast.success(data.message || `Petugas ${name} berhasil didaftarkan`)
      setOpen(false)
      setName("")
      setNim("")
      setPassword("")
      if (onOfficerAdded) onOfficerAdded()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl border-slate-200 font-bold gap-2 h-10 px-4 transition-all hover:bg-slate-50">
          <UserCheck className="h-4 w-4 text-primary" />
          <span>Tambah Petugas Komdis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] rounded-2xl border-none shadow-lg p-5 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Akun Petugas Baru
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            Daftarkan akun login untuk anggota Sie Kedisiplinan menggunakan NIM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="officer-name" className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Petugas</Label>
            <Input
              id="officer-name"
              placeholder="Contoh: Sarah Komdis"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="officer-nim" className="text-xs font-bold text-slate-500 uppercase ml-1">NIM Petugas</Label>
            <Input
              id="officer-nim"
              type="text"
              placeholder="Contoh: 24010203"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              required
              className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary transition-all text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="officer-pass" className="text-xs font-bold text-slate-500 uppercase ml-1">Password</Label>
            <Input
              id="officer-pass"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary transition-all text-sm font-mono"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary hover:bg-blue-600 font-bold text-sm transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Mendaftarkan..." : "Daftarkan Petugas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

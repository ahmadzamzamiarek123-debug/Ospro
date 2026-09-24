"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
export function AddMemberDialog({ onMemberAdded }: { onMemberAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [nim, setNim] = useState("")
  const [kelompok, setKelompok] = useState("Kelompok 1")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !nim) {
      toast.error("Nama dan NIM wajib diisi")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from("members").insert({
        name,
        nim,
        role: "peserta",
        kelompok: kelompok || "Kelompok 1"
      })

      if (error) {
        toast.error("Gagal menyimpan ke database Supabase: " + error.message)
        return
      }

      toast.success(`${name} (${kelompok}) berhasil ditambahkan`)
      setOpen(false)
      setName("")
      setNim("")
      setKelompok("Kelompok 1")
      onMemberAdded()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Periksa koneksi"
      toast.error("Gagal terhubung ke database: " + message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-primary hover:bg-blue-600 font-bold gap-2 h-10 px-4 transition-all">
          <UserPlus className="h-4 w-4" /> 
          <span className="hidden sm:inline">Tambah Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-lg p-5 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-black">Peserta Baru</DialogTitle>
          <DialogDescription className="text-xs font-medium">Input data peserta mahasiswa baru.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase ml-1">Nama</Label>
            <Input
              id="name"
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nim" className="text-xs font-bold text-slate-500 uppercase ml-1">NIM / ID</Label>
            <Input
              id="nim"
              placeholder="Contoh: 220101..."
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kelompok" className="text-xs font-bold text-slate-500 uppercase ml-1">Kelompok</Label>
            <Select value={kelompok} onValueChange={setKelompok}>
              <SelectTrigger className="h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-primary">
                <SelectValue placeholder="Pilih Kelompok" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Kelompok 1">Kelompok 1</SelectItem>
                <SelectItem value="Kelompok 2">Kelompok 2</SelectItem>
                <SelectItem value="Kelompok 3">Kelompok 3</SelectItem>
                <SelectItem value="Kelompok 4">Kelompok 4</SelectItem>
                <SelectItem value="Kelompok 5">Kelompok 5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-primary hover:bg-blue-600 font-bold text-sm transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Menyimpan..." : "Simpan Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

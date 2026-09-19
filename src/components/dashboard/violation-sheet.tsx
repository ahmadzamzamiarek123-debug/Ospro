"use client"

import { useState } from "react"
import { Member, Session, ViolationType } from "@/types/database"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ChevronRight, CheckCircle2, ShieldAlert, Heart, Info, Sparkles, Scale } from "lucide-react"

export interface MatrixItem {
  name: string
  defaultConsequence: string
}

export const VIOLATION_MATRIX: Record<ViolationType, MatrixItem[]> = {
  ringan: [
    { name: "Terlambat 5–10 menit", defaultConsequence: "Teguran + catatan + refleksi singkat" },
    { name: "Atribut tidak lengkap", defaultConsequence: "Melengkapi atribut + teguran" },
    { name: "Perlengkapan tidak dibawa", defaultConsequence: "Melengkapi perlengkapan + refleksi persiapan" },
    { name: "Mengobrol saat materi", defaultConsequence: "Teguran + kembali fokus + merangkum poin yang terlewat" },
    { name: "Lainnya", defaultConsequence: "Teguran langsung + perbaikan saat itu juga" },
  ],
  sedang: [
    { name: "Terlambat berulang", defaultConsequence: "Evaluasi + rencana perbaikan + pemantauan" },
    { name: "Berisik berulang setelah ditegur", defaultConsequence: "Pemanggilan + refleksi + tugas perbaikan" },
    { name: "Tidak mengerjakan tugas", defaultConsequence: "Menyelesaikan tugas + refleksi + kontribusi perbaikan" },
    { name: "Tidak hadir tanpa izin", defaultConsequence: "Klarifikasi + peringatan + tindak lanjut sesuai panitia" },
    { name: "Alasan/izin palsu", defaultConsequence: "Klarifikasi; tingkat berdasarkan dampak dan kesengajaan" },
    { name: "Mengajak peserta lain sengaja melanggar", defaultConsequence: "Klarifikasi + evaluasi; dapat dinaikkan bila berdampak luas" },
    { name: "Lainnya", defaultConsequence: "Peringatan komdis + refleksi tertulis / tugas perbaikan" },
  ],
  berat: [
    { name: "Meninggalkan kegiatan tanpa izin", defaultConsequence: "Klarifikasi khusus + surat pernyataan + evaluasi" },
    { name: "Sengaja merusak fasilitas", defaultConsequence: "Klarifikasi + pertanggungjawaban/pemulihan" },
    { name: "Perundungan/intimidasi", defaultConsequence: "Klarifikasi + penanganan khusus + pemulihan/eskalasi" },
    { name: "Mengabaikan instruksi keselamatan", defaultConsequence: "Hentikan tindakan berisiko + klarifikasi + evaluasi khusus" },
    { name: "Lainnya", defaultConsequence: "Pemanggilan dan klarifikasi khusus, surat pernyataan tanggung jawab" },
  ],
  baik: [
    { name: "Keaktifan bertanya / menjawab materi", defaultConsequence: "Apresiasi keaktifan peserta" },
    { name: "Inisiatif membantu sesama / kebersihan", defaultConsequence: "Apresiasi inisiatif kepedulian lingkungan/sesama" },
    { name: "Menunjukkan komitmen & perubahan positif", defaultConsequence: "Apresiasi komitmen & perbaikan perilaku" },
    { name: "Apresiasi lainnya", defaultConsequence: "Pencatatan poin kebaikan OSI" },
  ],
}

export function ViolationSheet({ member, session }: { member: Member, session: Session | null }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ViolationType | null>(null)
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [consequence, setConsequence] = useState("")
  const [chronology, setChronology] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const resetForm = () => {
    setType(null)
    setCategory("")
    setCustomCategory("")
    setConsequence("")
    setChronology("")
  }

  const handleCategorySelect = (selectedName: string) => {
    setCategory(selectedName)
    if (!type) return

    const item = VIOLATION_MATRIX[type].find(m => m.name === selectedName)
    if (item) {
      setConsequence(item.defaultConsequence)
    }
  }

  const handleSubmit = async () => {
    if (!type || !session) return
    if (!category && !customCategory) {
      toast.error("Pilih kategori terlebih dahulu")
      return
    }

    setIsLoading(true)
    const finalCategory = category === "Lainnya" || category === "Apresiasi lainnya" 
      ? (customCategory || category) 
      : category

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('violations').insert({
        member_id: member.id,
        violation_type: type,
        session_number: session.session_number,
        violation_category: finalCategory,
        consequence: consequence || null,
        status: type === 'baik' ? 'selesai' : 'pending',
        chronology: chronology || null,
        notes: chronology || null,
        recorded_by: user?.id
      })

      if (error) throw error

      toast.success("Catatan kedisiplinan disimpan", {
        description: `${member.name} - Sesi ${session.session_number}`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      })
      setOpen(false)
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan data"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const getBtnStyles = (t: ViolationType) => {
    switch (t) {
      case 'baik': return 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/60'
      case 'ringan': return 'bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100/60'
      case 'sedang': return 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100/60'
      case 'berat': return 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/60'
    }
  }

  const getIcon = (t: ViolationType) => {
    switch (t) {
      case 'baik': return <Heart className="h-4 w-4" />
      case 'ringan': return <Info className="h-4 w-4" />
      case 'sedang': return <Scale className="h-4 w-4" />
      case 'berat': return <ShieldAlert className="h-4 w-4" />
    }
  }

  const getTypeLabel = (t: ViolationType) => {
    switch (t) {
      case 'baik': return 'Apresiasi Baik'
      case 'ringan': return 'Sanksi Ringan'
      case 'sedang': return 'Sanksi Sedang'
      case 'berat': return 'Sanksi Berat'
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-100">
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] sm:h-[650px] h-auto rounded-t-3xl p-4 sm:p-6 bg-white overflow-hidden shadow-2xl border-t-2">
        <div className="space-y-6 overflow-y-auto max-h-full pb-10">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl sm:text-2xl font-black">Pencatatan Komdis</SheetTitle>
              {member.kelompok && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {member.kelompok}
                </span>
              )}
            </div>
            <SheetDescription className="text-xs sm:text-sm font-bold text-slate-500">
              {member.name} ({member.nim}) • Sesi {session?.session_number || "?"}
            </SheetDescription>
          </SheetHeader>

          {!type ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Pilih Kategori Tindakan</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(['baik', 'ringan', 'sedang', 'berat'] as ViolationType[]).map((t) => (
                  <Button
                    key={t}
                    variant="outline"
                    className={`h-16 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 font-black transition-all ${getBtnStyles(t)}`}
                    onClick={() => {
                      setType(t)
                      setCategory("")
                      setConsequence("")
                    }}
                  >
                    {getIcon(t)}
                    <span className="text-xs uppercase tracking-wider">{getTypeLabel(t)}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${getBtnStyles(type)}`}>
                  {getIcon(type)}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Kategori Terpilih</p>
                  <p className="font-black text-slate-900 leading-none">{getTypeLabel(type)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setType(null)} className="h-7 text-xs font-bold text-primary">Ganti</Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Jenis Pelanggaran / Kebaikan</label>
                  <Select value={category} onValueChange={handleCategorySelect}>
                    <SelectTrigger className="h-11 sm:h-12 bg-white border-slate-200 rounded-xl">
                      <SelectValue placeholder="Pilih rincian dari SOP..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {VIOLATION_MATRIX[type].map((item) => (
                        <SelectItem key={item.name} value={item.name} className="text-sm font-medium">
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(category === "Lainnya" || category === "Apresiasi lainnya") && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Rincian Khusus</label>
                    <Input 
                      placeholder="Tuliskan jenis kejadian..." 
                      className="h-11 sm:h-12 bg-white border-slate-200 rounded-xl"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Konsekuensi SOP Resmi
                    </label>
                    <span className="text-[10px] text-slate-400">Otomatis / Dapat diedit</span>
                  </div>
                  <Input 
                    placeholder="Konsekuensi sesuai SOP..." 
                    className="h-11 bg-slate-50/50 border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    value={consequence}
                    onChange={(e) => setConsequence(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Kronologi Singkat / Catatan</label>
                  <Textarea 
                    placeholder="Contoh: Terlambat hadir pada pembukaan sesi materi ke-2, langsung ditegur dan diberi lembar refleksi..." 
                    className="min-h-[80px] bg-white border-slate-200 rounded-xl p-3 text-xs"
                    value={chronology}
                    onChange={(e) => setChronology(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full h-12 sm:h-14 rounded-2xl bg-slate-900 hover:bg-black font-black text-white transition-all active:scale-[0.98]"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "Menyimpan Catatan..." : "Simpan Pencatatan Komdis"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

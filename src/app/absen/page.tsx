"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

function AbsenContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isVerifyingToken, setIsVerifyingToken] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [sessionNumber, setSessionNumber] = useState<number>(1)

  const [nim, setNim] = useState("")
  const [isLoadingMember, setIsLoadingMember] = useState(false)
  const [member, setMember] = useState<{
    id: string
    nim: string
    name: string
    kelompok: string
    role?: string
  } | null>(null)
  const [alreadyAttended, setAlreadyAttended] = useState(false)
  const [attendedAt, setAttendedAt] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    name: string
    nim: string
    kelompok: string
    role?: string
    scannedAt: string
    sessionNumber: number
  } | null>(null)

  // 1. Verifikasi token awal
  useEffect(() => {
    if (!token) {
      setIsVerifyingToken(false)
      setIsTokenValid(false)
      setTokenError("Barcode tidak ditemukan. Silakan scan ulang barcode dari layar laptop panitia.")
      return
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/attendance/lookup?token=${encodeURIComponent(token || "")}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          setIsTokenValid(false)
          setTokenError(data.error || "Barcode telah kadaluarsa. Silakan scan ulang barcode di laptop panitia.")
        } else {
          setIsTokenValid(true)
          setSessionNumber(data.sessionNumber || 1)
        }
      } catch {
        setIsTokenValid(false)
        setTokenError("Gagal memeriksa barcode. Pastikan koneksi internet stabil.")
      } finally {
        setIsVerifyingToken(false)
      }
    }

    checkToken()
  }, [token])

  // 2. Lookup data peserta saat NIM diketik
  useEffect(() => {
    const cleanNim = nim.trim()
    if (cleanNim.length < 3) {
      setMember(null)
      setMemberError(null)
      setAlreadyAttended(false)
      return
    }

    const timer = setTimeout(async () => {
      if (!token) return
      setIsLoadingMember(true)
      setMemberError(null)

      try {
        const res = await fetch(
          `/api/attendance/lookup?token=${encodeURIComponent(token)}&nim=${encodeURIComponent(cleanNim)}`
        )
        const data = await res.json()

        if (!res.ok || !data.success) {
          setMember(null)
          setMemberError(data.error || "Peserta tidak ditemukan")
          setAlreadyAttended(false)
        } else {
          setMember(data.member)
          setAlreadyAttended(data.alreadyAttended)
          setAttendedAt(data.attendedAt)
          setMemberError(null)
        }
      } catch {
        setMemberError("Gagal memeriksa NIM")
      } finally {
        setIsLoadingMember(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [nim, token])

  // 3. Submit Kehadiran
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !member) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nim: member.nim
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.isExpired) {
          setIsTokenValid(false)
          setTokenError(data.error)
        } else {
          toast.error(data.error || "Gagal melakukan presensi")
        }
        return
      }

      setSuccessData({
        name: data.member.name,
        nim: data.member.nim,
        kelompok: data.member.kelompok,
        role: data.member.role,
        scannedAt: data.scannedAt,
        sessionNumber: data.sessionNumber
      })
      setIsSuccess(true)
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setIsSubmitting(false)
    }
  }

  // State Verifikasi Awal
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-xs font-semibold text-slate-400">Memverifikasi barcode...</p>
      </div>
    )
  }

  // State Barcode Expired / Rusak
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
          >
            <ArrowLeft className="h-3 w-3 mr-1" /> Beranda
          </Link>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-11 w-11 rounded-xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">Barcode Tidak Sah</h2>
                <p className="text-xs text-slate-500">
                  {tokenError || "Barcode telah kadaluarsa karena batas waktu lewat."}
                </p>
              </div>
              <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                Silakan scan barcode terbaru yang sedang tampil di layar laptop panitia.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full h-10 rounded-xl border-slate-200 text-xs font-bold"
              >
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // State Sukses Presensi (Minimalist Card)
  if (isSuccess && successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              KEDIS<span className="text-primary">.</span>
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Presensi {successData.role === "panitia" ? "Panitia" : "Peserta"} • Sesi {successData.sessionNumber}
            </p>
          </div>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Presensi Berhasil</h2>
                  <p className="text-xs text-slate-500">Kehadiran Anda telah dicatat</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Nama</span>
                  <span className="font-bold text-slate-900 text-right">{successData.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">NIM</span>
                  <span className="font-mono font-bold text-slate-800">{successData.nim}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">
                    {successData.role === "panitia" ? "Divisi / Bagian" : "Kelompok"}
                  </span>
                  <span className="font-bold text-primary">{successData.kelompok}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Waktu</span>
                  <span className="font-mono font-bold text-slate-800">
                    {new Date(successData.scannedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}{" "}
                    WIB
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  Tunjukkan layar ini ke panitia di meja registrasi.
                </p>
              </div>

              <Link href="/" className="block">
                <Button variant="outline" className="w-full h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600">
                  Kembali ke Beranda
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // State Form Input NIM
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Beranda
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            KEDIS<span className="text-primary">.</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {member?.role === "panitia" ? "Presensi Panitia" : "Presensi Peserta & Panitia"} • Sesi {sessionNumber}
          </p>
        </div>

        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  NIM
                </label>
                <Input
                  type="text"
                  placeholder="Masukkan NIM Anda"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  autoFocus
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl transition-all font-mono font-bold"
                />
              </div>

              {/* Status Pengecekan NIM */}
              {isLoadingMember && (
                <p className="text-[11px] text-slate-400 font-medium px-1">Mencari data...</p>
              )}

              {memberError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                  {memberError}
                </div>
              )}

              {/* Box Preview Data Peserta / Panitia */}
              {member && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {member.role === "panitia" ? `Panitia • ${member.kelompok}` : member.kelompok}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">NIM: {member.nim}</p>

                  {alreadyAttended && (
                    <div className="pt-2 mt-2 border-t border-slate-200/60 text-xs text-amber-700 font-medium">
                      Anda sudah tercatat hadir pada Sesi {sessionNumber}{" "}
                      {attendedAt
                        ? `(pukul ${new Date(attendedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })} WIB)`
                        : ""}
                      .
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={!member || alreadyAttended || isSubmitting}
                className="w-full h-11 rounded-xl bg-primary hover:bg-blue-600 font-bold text-sm transition-all active:scale-[0.98]"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : alreadyAttended
                  ? "Sudah Pernah Hadir"
                  : "Konfirmasi Hadir"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Jika mengalami kendala, hubungi panitia penjaga laptop.
        </p>
      </div>
    </div>
  )
}

export default function AbsenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-xs font-semibold text-slate-400">Memuat...</p>
        </div>
      }
    >
      <AbsenContent />
    </Suspense>
  )
}

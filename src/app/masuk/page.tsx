"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanNim = nim.trim().toLowerCase();
    let authEmail = cleanNim.includes("@")
      ? cleanNim
      : `${cleanNim}@kedis.local`;

    try {
      const supabase = createClient();

      // Cari email resmi berdasarkan NIM di tabel public.users
      try {
        const { data: userProfile } = await supabase
          .from("users")
          .select("email")
          .eq("nim", cleanNim)
          .single();
        if (userProfile?.email) {
          authEmail = userProfile.email;
        }
      } catch {
        // gunakan authEmail default
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        toast.error("NIM atau password salah. Pastikan database Supabase terhubung.");
        return;
      }

      toast.success("Berhasil masuk");
      window.location.href = "/dashboard";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Periksa koneksi"
      toast.error("Gagal terhubung ke database: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in">
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
            Masuk sebagai Panitia
          </p>
        </div>

        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-5 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  NIM
                </label>
                <Input
                  type="text"
                  placeholder="25120001"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl transition-all"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-blue-600 font-bold text-sm transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? "Menghubungkan..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

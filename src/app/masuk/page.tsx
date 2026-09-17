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
    const authEmail = cleanNim.includes("@")
      ? cleanNim
      : `${cleanNim}@kedis.local`;

    const isMockAdmin =
      (cleanNim === "admin" || cleanNim === "20240001") &&
      password === "admin12345";
    const isMockOfficer =
      (cleanNim === "komdis" || cleanNim === "20240002") &&
      password === "komdis12345";

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        if (isMockAdmin || isMockOfficer) {
          const userObj = isMockAdmin
            ? {
                id: "u-001",
                nim: cleanNim,
                email: authEmail,
                name: "Super Admin Kedis",
                role: "admin",
              }
            : {
                id: "u-002",
                nim: cleanNim,
                email: authEmail,
                name: "Captain Sarah (Komdis)",
                role: "viewer",
              };
          document.cookie = `mock_user=${encodeURIComponent(JSON.stringify(userObj))}; path=/; max-age=86400; SameSite=Lax`;
          toast.success("Berhasil masuk");
          window.location.href = "/dashboard";
          return;
        }
        toast.error("NIM atau password salah");
        return;
      }

      toast.success("Berhasil masuk");
      window.location.href = "/dashboard";
    } catch {
      if (isMockAdmin || isMockOfficer) {
        const userObj = isMockAdmin
          ? {
              id: "u-001",
              nim: cleanNim,
              email: authEmail,
              name: "Super Admin Kedis",
              role: "admin",
            }
          : {
              id: "u-002",
              nim: cleanNim,
              email: authEmail,
              name: "Captain Sarah (Komdis)",
              role: "viewer",
            };
        document.cookie = `mock_user=${encodeURIComponent(JSON.stringify(userObj))}; path=/; max-age=86400; SameSite=Lax`;
        toast.success("Berhasil masuk");
        window.location.href = "/dashboard";
        return;
      }
      toast.error("Terjadi kesalahan sistem");
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

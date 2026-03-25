"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Building2, ArrowLeft } from "lucide-react";
import Image from "next/image";

type Mode = "login" | "register";

// ─── Defined OUTSIDE LoginContent so it never remounts on re-render ───
function InputField({
  label, value, onChange, type = "text", placeholder, icon: Icon, optional = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder: string;
  icon?: React.ElementType;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {optional && <span className="ml-1.5 text-xs text-slate-500">(ไม่บังคับ)</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 rounded-xl input-dark text-sm`}
        />
      </div>
    </div>
  );
}

// ─── Main page content ───
function LoginContent() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("กรุณากรอกข้อมูลให้ครบ");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message);
    } else {
      toast.success("เข้าสู่ระบบสำเร็จ!");
      window.location.href = redirect;
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return toast.error("กรุณากรอกชื่อ อีเมล และรหัสผ่าน");
    if (password.length < 8) return toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
        });
      }
      toast.success("ส่งอีเมลยืนยันแล้ว! กรุณาตรวจสอบกล่องจดหมายของคุณ");
      setMode("login");
    }
    setLoading(false);
  };

  const handleSubmit = mode === "login" ? handleEmailLogin : handleRegister;

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-glow">
              <Image src="/icon-logo.png" alt="SMC Logo" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-xl text-white">SMC Booking</p>
              <p className="text-xs text-slate-400">ระบบจองห้องประชุม</p>
            </div>
          </Link>
        </div>

        <div className="glass rounded-2xl p-8 border border-primary-700/20 shadow-2xl">

          {/* Mode tabs */}
          <div className="flex rounded-lg overflow-hidden mb-6 border border-white/10">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${mode === "login" ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${mode === "register" ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                สมัครสมาชิก
              </button>
            </div>





          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === "register" && (
              <InputField
                label="ชื่อ-นามสกุล"
                value={fullName}
                onChange={setFullName}
                placeholder="กรอกชื่อ-นามสกุล"
              />
            )}

            <InputField
              label="อีเมล"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="your@email.com"
              icon={Mail}
            />

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "อย่างน้อย 8 ตัวอักษร" : "รหัสผ่าน"}
                    className="w-full pl-10 pr-10 py-3 rounded-xl input-dark text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>



            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl btn-primary font-display font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังดำเนินการ...
                </span>
              ) : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </form>

          {mode === "register" && (
            <p className="text-xs text-slate-500 text-center mt-4">
              คุณจะได้รับอีเมลยืนยัน กรุณาตรวจสอบกล่องจดหมายของคุณ
            </p>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/" className="text-primary-400 hover:text-primary-300 transition-colors">
            ← กลับหน้าหลัก
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

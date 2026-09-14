"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) setError(result.error.message || "注册失败，请检查填写内容。");
      else router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "注册失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef6f5] px-4 py-8 text-[#20252b] sm:px-6">
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#bdebe4]/70 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full bg-[#dbe4ff]/70 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/80 bg-white/70 shadow-[0_24px_80px_rgba(24,57,61,.14)] backdrop-blur-xl lg:grid-cols-[.9fr_1.1fr]">
        <section className="ripple-grid relative hidden overflow-hidden bg-[#0c6f78] p-10 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 -top-20 size-64 rounded-full border-[28px] border-white/10" /><div className="absolute -bottom-24 -left-20 size-72 rounded-full border-[36px] border-[#28c5b4]/20" /><div className="relative"><div className="grid size-12 place-items-center rounded-2xl bg-white/15"><WalletCards size={25} /></div><p className="mt-6 text-sm font-semibold tracking-[.24em] text-[#a8eee5]">TIDAL LEDGER</p><h1 className="mt-4 max-w-sm text-4xl font-black leading-tight tracking-[-.05em]">从今天开始，<br />记住你的生活。</h1><p className="mt-5 max-w-xs text-sm leading-6 text-white/70">一个轻巧、清楚、属于你的个人账本。</p></div><p className="relative text-xs text-white/45">先记下来，之后再慢慢看懂。</p></section>
        <section className="p-6 sm:p-10 lg:p-14"><div className="mx-auto max-w-md"><div className="mb-8 lg:hidden"><div className="grid size-11 place-items-center rounded-2xl bg-[#e1f7f4] text-[#0c6f78]"><WalletCards size={22} /></div><p className="mt-3 text-xs font-bold tracking-[.22em] text-[#0c6f78]">TIDAL LEDGER</p></div><div><p className="text-sm font-semibold text-[#0c6f78]">创建新空间</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">注册你的账本</h2><p className="mt-3 text-sm leading-6 text-[#7b8790]">只需要几秒，就可以开始记录。</p></div><form onSubmit={handleSubmit} className="mt-8 space-y-5">{error && <div role="alert" className="rounded-2xl border border-[#f4c9bd] bg-[#fff5f1] px-4 py-3 text-sm leading-5 text-[#c45438]">{error}</div>}<label className="block text-sm font-semibold text-[#4d5a62]">称呼<div className="relative mt-2"><UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa7ad]" size={18} /><Input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required disabled={loading} placeholder="例如：小明" className="h-12 rounded-2xl border-[#dce8e6] bg-[#f7fbfa] pl-11 text-[15px] shadow-none placeholder:text-[#aab5b9] focus-visible:border-[#28c5b4] focus-visible:ring-4 focus-visible:ring-[#28c5b4]/15" /></div></label><label className="block text-sm font-semibold text-[#4d5a62]">邮箱<div className="relative mt-2"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa7ad]" size={18} /><Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} placeholder="you@example.com" className="h-12 rounded-2xl border-[#dce8e6] bg-[#f7fbfa] pl-11 text-[15px] shadow-none placeholder:text-[#aab5b9] focus-visible:border-[#28c5b4] focus-visible:ring-4 focus-visible:ring-[#28c5b4]/15" /></div></label><label className="block text-sm font-semibold text-[#4d5a62]">密码<div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa7ad]" size={18} /><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={loading} placeholder="至少输入 8 位密码" className="h-12 rounded-2xl border-[#dce8e6] bg-[#f7fbfa] pl-11 pr-12 text-[15px] shadow-none placeholder:text-[#aab5b9] focus-visible:border-[#28c5b4] focus-visible:ring-4 focus-visible:ring-[#28c5b4]/15" /><button type="button" onClick={() => setShowPassword((value) => !value)} disabled={loading} aria-label={showPassword ? "隐藏密码" : "显示密码"} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-[#8b9aa0] hover:bg-[#e8f5f3] hover:text-[#0c6f78]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl bg-[#0c6f78] text-base font-bold text-white shadow-[0_10px_24px_rgba(12,111,120,.2)] hover:bg-[#095d65]">{loading ? "创建中…" : "创建账号"}</Button></form><p className="mt-7 text-center text-sm text-[#7b8790]">已经有账号？ <Link href="/sign-in" className="font-bold text-[#0c6f78] hover:underline">直接登录</Link></p></div></section>
      </div>
    </main>
  );
}
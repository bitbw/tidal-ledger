"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Mail, UserRound, WalletCards } from "lucide-react";
import { signOut, useSession } from "@/lib/auth/client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in");
  }, [isPending, router, session?.user]);

  if (isPending || !session?.user) return <main className="grid min-h-screen place-items-center bg-[#eef6f5] text-sm text-[#7b8790]">正在读取账号信息…</main>;

  const user = session.user;
  const initial = user.name?.slice(0, 1).toUpperCase() || "B";
  return <main className="min-h-screen bg-[#eef6f5] px-4 py-6 text-[#20252b] sm:px-6 sm:py-10"><div className="mx-auto max-w-2xl"><header className="flex items-center gap-3"><button type="button" onClick={() => router.back()} aria-label="返回" className="grid size-10 place-items-center rounded-xl bg-white text-[#587078] shadow-sm transition hover:bg-[#f5fbfa]"><ArrowLeft size={19} /></button><div><p className="text-xs font-bold tracking-[.2em] text-[#0c6f78]">TIDAL LEDGER</p><h1 className="mt-1 text-2xl font-black tracking-[-.04em]">用户设置</h1></div></header><section className="mt-6 overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(24,57,61,.1)]"><div className="bg-[#0c6f78] px-6 py-7 text-white sm:px-8"><div className="grid size-16 place-items-center rounded-2xl bg-white/15 text-2xl font-black">{initial}</div><h2 className="mt-5 text-xl font-bold">{user.name || "未设置称呼"}</h2><p className="mt-1 text-sm text-white/70">你的个人账本账号</p></div><div className="divide-y divide-[#edf0f0] px-6 sm:px-8"><div className="flex items-center gap-4 py-5"><span className="grid size-10 place-items-center rounded-xl bg-[#e4f7f4] text-[#0c6f78]"><UserRound size={18} /></span><div><p className="text-xs text-[#8b94a3]">称呼</p><p className="mt-1 font-medium">{user.name || "未设置"}</p></div></div><div className="flex items-center gap-4 py-5"><span className="grid size-10 place-items-center rounded-xl bg-[#edf0ff] text-[#5579de]"><Mail size={18} /></span><div><p className="text-xs text-[#8b94a3]">邮箱</p><p className="mt-1 font-medium">{user.email}</p></div></div></div><div className="border-t border-[#edf0f0] px-6 py-6 sm:px-8"><button type="button" onClick={async () => { await signOut(); window.location.assign("/sign-in"); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f1c6bb] bg-[#fff8f6] text-sm font-bold text-[#c45438] transition hover:bg-[#fff0eb]"><LogOut size={18} />退出登录</button></div></section><div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#98a1aa]"><WalletCards size={14} />账号信息仅用于你的账本服务</div></div></main>;
}
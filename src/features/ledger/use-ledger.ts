"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type LedgerTransaction = { id: string; transactionType: string; amountCents: number; occurredAt: string; merchantName: string | null; note: string | null; accountId: string | null };
type LedgerPayload = { book: { id: string; name: string }; accounts: { id: string; name: string; color: string }[]; transactions: LedgerTransaction[] };

export function useLedger(enabled: boolean) {
  const [data, setData] = useState<LedgerPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError("");
    const result = await fetch("/api/ledger", { cache: "no-store" });
    if (!result.ok) { setError(result.status === 401 ? "登录已失效，请重新登录。" : "读取云端账本失败。"); setLoading(false); return; }
    setData(await result.json() as LedgerPayload); setLoading(false);
  }, [enabled]);
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  const addTransaction = useCallback(async (input: { transactionType: string; amountCents: number; categoryName: string; note?: string }) => {
    const result = await fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!result.ok) { const body = await result.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error ?? "保存账目失败。"); }
    await refresh();
  }, [refresh]);
  const totals = useMemo(() => (data?.transactions ?? []).reduce((sum, item) => {
    const amount = item.amountCents / 100;
    if (item.transactionType === "income") sum.income += amount;
    if (item.transactionType === "expense") sum.expense += amount;
    return sum;
  }, { income: 0, expense: 0 }), [data]);
  return { book: data?.book ?? null, accounts: data?.accounts ?? [], transactions: data?.transactions ?? [], loading, error, refresh, addTransaction, totals: { ...totals, balance: totals.income - totals.expense } };
}

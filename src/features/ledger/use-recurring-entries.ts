"use client";

import { useCallback, useEffect, useState } from "react";

export type RecurringEntry = {
  id: string;
  status: "active" | "ended";
  transactionType: "expense" | "income";
  amountCents: number;
  note: string | null;
  intervalCount: number;
  intervalUnit: "day" | "week" | "month" | "year";
  startAt: string;
  nextRunAt: string;
  endAt: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string;
};
export type RecurringInput = {
  transactionType: "expense" | "income";
  categoryId: string;
  accountId?: string | null;
  amountCents: number;
  note?: string;
  intervalCount: number;
  intervalUnit: "day" | "week" | "month" | "year";
  startAt: string;
  endAt?: string | null;
};

async function request<T>(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error ?? "周期账操作失败。");
  }
  return (await response.json()) as T;
}

export function useRecurringEntries(enabled: boolean) {
  const [active, setActive] = useState<RecurringEntry[]>([]);
  const [ended, setEnded] = useState<RecurringEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError("");
    try {
      const [activeRows, endedRows] = await Promise.all([request<RecurringEntry[]>("/api/recurring-entries"), request<RecurringEntry[]>("/api/recurring-entries?status=ended")]);
      setActive(activeRows); setEnded(endedRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "读取周期账失败。"); }
    finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => { void refresh(); }, [refresh]);
  const mutate = useCallback(async <T,>(url: string, method: string, body?: unknown) => { const result = await request<T>(url, method, body); await refresh(); return result; }, [refresh]);
  return {
    active, ended, loading, error, refresh,
    create: (input: RecurringInput) => mutate<RecurringEntry>("/api/recurring-entries", "POST", input),
    update: (id: string, input: RecurringInput) => mutate<RecurringEntry>(`/api/recurring-entries/${id}`, "PATCH", input),
    get: (id: string) => request<RecurringEntry & { generated: { id: string; occurredAt: string; amountCents: number; note: string | null }[] }>(`/api/recurring-entries/${id}`),
    end: (id: string) => mutate<RecurringEntry>(`/api/recurring-entries/${id}/end`, "POST"),
    archive: (id: string) => mutate<RecurringEntry>(`/api/recurring-entries/${id}`, "DELETE"),
  };
}

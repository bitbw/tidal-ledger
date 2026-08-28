"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportDetailFilter, ReportTransaction } from "@/features/ledger/report-types";

export function useLedgerTransactions(filter: ReportDetailFilter | null) {
  const [items, setItems] = useState<ReportTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (cursor?: string | null, append = false) => {
    if (!filter) return;
    setLoading(true); setError("");
    const params = new URLSearchParams({ start: filter.startAt, end: filter.endAt, types: filter.types.join(","), limit: "50" });
    if (filter.categoryLevel) params.set("categoryLevel", filter.categoryLevel);
    if (filter.categoryId) params.set("categoryId", filter.categoryId);
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(`/api/ledger/transactions?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("读取流水明细失败。");
      const payload = (await response.json()) as { items: ReportTransaction[]; nextCursor: string | null };
      setItems((current) => append ? [...current, ...payload.items] : payload.items);
      setNextCursor(payload.nextCursor);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "读取流水明细失败。"); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { if (filter) void load(); else { setItems([]); setNextCursor(null); setError(""); } }, [filter, load]);
  return { items, loading, error, hasMore: Boolean(nextCursor), loadMore: () => load(nextCursor, true) };
}

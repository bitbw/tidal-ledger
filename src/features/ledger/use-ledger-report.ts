"use client";

import { useCallback, useEffect, useState } from "react";
import type { LedgerReport, LedgerReportScope } from "@/features/ledger/report-types";

export function useLedgerReport(enabled: boolean, scope: LedgerReportScope) {
  const [data, setData] = useState<LedgerReport | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError("");
    const params = new URLSearchParams({ scope: scope.type });
    if (scope.date) params.set("date", scope.date);
    try {
      const response = await fetch(`/api/ledger/reports?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "登录已失效，请重新登录。" : "读取报表失败。");
      setData((await response.json()) as LedgerReport);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "读取报表失败。"); }
    finally { setLoading(false); }
  }, [enabled, scope.date, scope.type]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

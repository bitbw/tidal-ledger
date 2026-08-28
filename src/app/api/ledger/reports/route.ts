import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getLedgerReport } from "@/features/ledger/reports-server";
import type { LedgerReportScope } from "@/features/ledger/report-types";
import { auth } from "@/lib/auth/server";

function parseScope(request: NextRequest): LedgerReportScope | null {
  const scope = request.nextUrl.searchParams.get("scope") ?? "month";
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  if (scope === "month" && date && /^\d{4}-(0[1-9]|1[0-2])$/.test(date)) return { type: "month", date };
  if (scope === "year" && date && /^\d{4}$/.test(date)) return { type: "year", date };
  if (scope === "all") return { type: "all" };
  return null;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = parseScope(request);
  if (!scope) return NextResponse.json({ error: "Invalid report scope" }, { status: 400 });
  return NextResponse.json(await getLedgerReport(session.user.id, scope));
}

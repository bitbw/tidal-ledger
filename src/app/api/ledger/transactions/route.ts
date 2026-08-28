import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getLedgerTransactions } from "@/features/ledger/reports-server";
import { auth } from "@/lib/auth/server";

function dateParam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const start = dateParam(request.nextUrl.searchParams.get("start"));
  const end = dateParam(request.nextUrl.searchParams.get("end"));
  const types = (request.nextUrl.searchParams.get("types") ?? "").split(",").filter((item): item is "income" | "expense" => item === "income" || item === "expense");
  const categoryLevel = request.nextUrl.searchParams.get("categoryLevel");
  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
  const cursor = dateParam(request.nextUrl.searchParams.get("cursor"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  if (!start || !end || start >= end || !types.length || (categoryLevel !== null && categoryLevel !== "major" && categoryLevel !== "minor") || (Boolean(categoryLevel) !== Boolean(categoryId))) {
    return NextResponse.json({ error: "Invalid transaction filter" }, { status: 400 });
  }
  return NextResponse.json(await getLedgerTransactions(session.user.id, {
    start, end, types, cursor: cursor ?? undefined, limit,
    categoryLevel: categoryLevel ?? undefined, categoryId,
  }));
}

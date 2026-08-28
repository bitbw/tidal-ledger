import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { endRecurringEntry } from "@/features/ledger/recurring";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entry = await endRecurringEntry(session.user.id, (await params).id);
  return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { createRecurringEntry, getRecurringEntries, type RecurringInput } from "@/features/ledger/recurring";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") === "ended" ? "ended" : "active";
  return NextResponse.json(await getRecurringEntries(user.id, status));
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Partial<RecurringInput>;
  if (!body.categoryId || !body.transactionType || typeof body.amountCents !== "number" || !body.intervalCount || !body.intervalUnit || !body.startAt) return NextResponse.json({ error: "Invalid recurring entry" }, { status: 400 });
  try {
    return NextResponse.json(await createRecurringEntry(user.id, body as RecurringInput));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建周期账失败。" }, { status: 400 });
  }
}

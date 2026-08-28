import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { archiveRecurringEntry, getRecurringEntry, type RecurringInput, updateRecurringEntry } from "@/features/ledger/recurring";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entry = await getRecurringEntry(user.id, (await params).id);
  return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Partial<RecurringInput>;
  if (!body.categoryId || !body.transactionType || typeof body.amountCents !== "number" || !body.intervalCount || !body.intervalUnit || !body.startAt) return NextResponse.json({ error: "Invalid recurring entry" }, { status: 400 });
  try {
    const entry = await updateRecurringEntry(user.id, (await params).id, body as RecurringInput);
    return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新周期账失败。" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entry = await archiveRecurringEntry(user.id, (await params).id);
  return entry ? NextResponse.json(entry) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

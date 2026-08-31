import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  createLedgerTransaction,
  ensureDefaultLedger,
  getLedger,
  updateLedgerTransaction,
} from "@/features/ledger/server";
import { runDueRecurringEntriesForBook } from "@/features/ledger/recurring";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookId = await ensureDefaultLedger(user.id);
  await runDueRecurringEntriesForBook(bookId);
  return NextResponse.json(await getLedger(user.id));
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    transactionType?: "expense" | "income";
    amountCents?: number;
    categoryId?: string;
    note?: string;
    occurredAt?: string;
  };
  const amountCents = body.amountCents;
  if (
    !body.transactionType ||
    !body.categoryId ||
    (body.transactionType !== "expense" && body.transactionType !== "income") ||
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  )
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  return NextResponse.json(
    await createLedgerTransaction(user.id, {
      transactionType: body.transactionType,
      amountCents,
      categoryId: body.categoryId,
      note: body.note,
      occurredAt: body.occurredAt,
    }),
  );
}

export async function PATCH(request: Request) {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    id?: string;
    transactionType?: "expense" | "income";
    amountCents?: number;
    categoryId?: string;
    note?: string;
    occurredAt?: string;
  };
  const amountCents = body.amountCents;
  if (
    !body.id ||
    !body.transactionType ||
    !body.categoryId ||
    (body.transactionType !== "expense" && body.transactionType !== "income") ||
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  )
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const transaction = await updateLedgerTransaction(user.id, body.id, {
    transactionType: body.transactionType,
    amountCents,
    categoryId: body.categoryId,
    note: body.note,
    occurredAt: body.occurredAt,
  });
  if (!transaction)
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 },
    );
  return NextResponse.json(transaction);
}

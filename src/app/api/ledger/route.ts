import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  createLedgerTransaction,
  getLedger,
  updateLedgerTransaction,
} from "@/features/ledger/server";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET() {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getLedger(user.id));
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    transactionType?: string;
    amountCents?: number;
    categoryName?: string;
    note?: string;
  };
  const amountCents = body.amountCents;
  if (
    !body.transactionType ||
    !body.categoryName ||
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  )
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  return NextResponse.json(
    await createLedgerTransaction(user.id, {
      transactionType: body.transactionType,
      amountCents,
      categoryName: body.categoryName,
      note: body.note,
    }),
  );
}

export async function PATCH(request: Request) {
  const user = await sessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    id?: string;
    transactionType?: string;
    amountCents?: number;
    categoryName?: string;
    note?: string;
  };
  const amountCents = body.amountCents;
  if (
    !body.id ||
    !body.transactionType ||
    !body.categoryName ||
    typeof amountCents !== "number" ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  )
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const transaction = await updateLedgerTransaction(user.id, body.id, {
    transactionType: body.transactionType,
    amountCents,
    categoryName: body.categoryName,
    note: body.note,
  });
  if (!transaction)
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 },
    );
  return NextResponse.json(transaction);
}

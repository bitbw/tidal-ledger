import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { recurringEntries } from "@/features/ledger/schema";
import { runDueRecurringEntriesForBook } from "@/features/ledger/recurring";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const books = await db.selectDistinct({ bookId: recurringEntries.bookId }).from(recurringEntries);
  let generated = 0;
  for (const { bookId } of books) generated += await runDueRecurringEntriesForBook(bookId);
  return NextResponse.json({ generated });
}

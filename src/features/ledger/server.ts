import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, bookMembers, books, categories, transactions } from "@/features/ledger/schema";

export async function ensureDefaultLedger(userId: string) {
  const existing = await db.query.bookMembers.findFirst({ where: eq(bookMembers.userId, userId), with: { } });
  if (existing) return existing.bookId;

  return db.transaction(async (tx) => {
    const again = await tx.query.bookMembers.findFirst({ where: eq(bookMembers.userId, userId) });
    if (again) return again.bookId;
    const [book] = await tx.insert(books).values({ name: "日常账本" }).returning();
    await tx.insert(bookMembers).values({ bookId: book.id, userId, role: "owner" });
    await tx.insert(accounts).values([
      { bookId: book.id, name: "微信支付", accountType: "wallet", color: "#28c5b4" },
      { bookId: book.id, name: "支付宝", accountType: "wallet", color: "#5579de" },
      { bookId: book.id, name: "现金", accountType: "cash", color: "#f49a5d" },
    ]);
    await tx.insert(categories).values([
      { bookId: book.id, name: "早餐", kind: "expense", icon: "coffee", sortOrder: 1 },
      { bookId: book.id, name: "午餐", kind: "expense", icon: "utensils", sortOrder: 2 },
      { bookId: book.id, name: "晚餐", kind: "expense", icon: "utensils", sortOrder: 3 },
      { bookId: book.id, name: "饮料水果", kind: "expense", icon: "sparkles", sortOrder: 4 },
      { bookId: book.id, name: "交通", kind: "expense", icon: "car", color: "#5579de", sortOrder: 5 },
      { bookId: book.id, name: "购物", kind: "expense", icon: "bag", color: "#f49a5d", sortOrder: 6 },
      { bookId: book.id, name: "工资薪水", kind: "income", icon: "wallet", color: "#ff714b", sortOrder: 1 },
      { bookId: book.id, name: "报销", kind: "income", icon: "receipt", color: "#ff714b", sortOrder: 2 },
    ]);
    return book.id;
  });
}

export async function getLedger(userId: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [[book], accountRows, transactionRows] = await Promise.all([
    db.select().from(books).where(eq(books.id, bookId)).limit(1),
    db.select().from(accounts).where(eq(accounts.bookId, bookId)).orderBy(accounts.createdAt),
    db.select().from(transactions).where(and(eq(transactions.bookId, bookId), isNull(transactions.deletedAt))).orderBy(desc(transactions.occurredAt)).limit(300),
  ]);
  return { book, accounts: accountRows, transactions: transactionRows };
}

export async function createLedgerTransaction(userId: string, input: { transactionType: string; amountCents: number; categoryName: string; note?: string }) {
  const bookId = await ensureDefaultLedger(userId);
  const [account] = await db.select().from(accounts).where(eq(accounts.bookId, bookId)).orderBy(accounts.createdAt).limit(1);
  const [category] = await db.select().from(categories).where(and(eq(categories.bookId, bookId), eq(categories.name, input.categoryName))).limit(1);
  const [transaction] = await db.insert(transactions).values({
    bookId,
    accountId: account?.id ?? null,
    categoryId: category?.id ?? null,
    transactionType: input.transactionType,
    amountCents: input.amountCents,
    occurredAt: new Date(),
    merchantName: input.categoryName,
    note: input.note ?? null,
    source: "manual",
    createdBy: userId,
  }).returning();
  return transaction;
}

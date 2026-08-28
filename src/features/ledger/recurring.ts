import { and, asc, desc, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  categories,
  recurringEntries,
  transactions,
} from "@/features/ledger/schema";
import { ensureDefaultLedger } from "@/features/ledger/server";

export type RecurringIntervalUnit = "day" | "week" | "month" | "year";
export type RecurringInput = {
  transactionType: "expense" | "income";
  categoryId: string;
  accountId?: string | null;
  amountCents: number;
  note?: string;
  intervalCount: number;
  intervalUnit: RecurringIntervalUnit;
  startAt: string;
  endAt?: string | null;
};

const allowedUnits = new Set<RecurringIntervalUnit>(["day", "week", "month", "year"]);

export function intervalLabel(count: number, unit: RecurringIntervalUnit) {
  if (count === 1) return `每${unit === "day" ? "天" : unit === "week" ? "周" : unit === "month" ? "月" : "年"}`;
  return `每 ${count} ${unit === "day" ? "天" : unit === "week" ? "周" : unit === "month" ? "月" : "年"}`;
}

export function nextRecurringDate(
  current: Date,
  startAt: Date,
  count: number,
  unit: RecurringIntervalUnit,
) {
  const next = new Date(current);
  if (unit === "day") next.setUTCDate(next.getUTCDate() + count);
  if (unit === "week") next.setUTCDate(next.getUTCDate() + count * 7);
  if (unit === "month" || unit === "year") {
    const monthDelta = unit === "month" ? count : count * 12;
    const targetMonth = next.getUTCMonth() + monthDelta;
    const targetYear = next.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const targetDay = startAt.getUTCDate();
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    next.setUTCFullYear(targetYear, normalizedMonth, Math.min(targetDay, lastDay));
  }
  return next;
}

async function validateRecurringInput(bookId: string, input: RecurringInput) {
  if (input.transactionType !== "expense" && input.transactionType !== "income") throw new Error("周期账仅支持收入或支出。");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("请输入大于 0 的金额。");
  if (!Number.isInteger(input.intervalCount) || input.intervalCount < 1 || input.intervalCount > 99 || !allowedUnits.has(input.intervalUnit)) throw new Error("重复周期不正确。");
  const startAt = new Date(input.startAt);
  const endAt = input.endAt ? new Date(input.endAt) : null;
  if (Number.isNaN(startAt.getTime()) || (endAt && Number.isNaN(endAt.getTime()))) throw new Error("开始或结束时间不正确。");
  if (endAt && endAt < startAt) throw new Error("结束时间不能早于开始时间。");
  const [category] = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!category || category.kind !== input.transactionType || (input.transactionType === "expense" && !category.parentId) || (input.transactionType === "income" && category.parentId)) throw new Error("请选择可记账的分类。");
  if (input.accountId) {
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, input.accountId), eq(accounts.bookId, bookId))).limit(1);
    if (!account) throw new Error("账户不属于当前账本。");
  }
  return { category, startAt, endAt };
}

export async function createRecurringEntry(userId: string, input: RecurringInput) {
  const bookId = await ensureDefaultLedger(userId);
  const { startAt, endAt } = await validateRecurringInput(bookId, input);
  const [entry] = await db.insert(recurringEntries).values({
    bookId,
    accountId: input.accountId ?? null,
    categoryId: input.categoryId,
    transactionType: input.transactionType,
    amountCents: input.amountCents,
    note: input.note?.trim() || null,
    intervalCount: input.intervalCount,
    intervalUnit: input.intervalUnit,
    startAt,
    nextRunAt: startAt,
    endAt,
    createdBy: userId,
  }).returning();
  return entry;
}

export async function updateRecurringEntry(userId: string, id: string, input: RecurringInput) {
  const bookId = await ensureDefaultLedger(userId);
  const [entry] = await db.select().from(recurringEntries).where(and(eq(recurringEntries.id, id), eq(recurringEntries.bookId, bookId), isNull(recurringEntries.archivedAt))).limit(1);
  if (!entry) return null;
  const { startAt, endAt } = await validateRecurringInput(bookId, input);
  const nextRunAt = entry.nextRunAt < startAt ? startAt : entry.nextRunAt;
  const [updated] = await db.update(recurringEntries).set({
    accountId: input.accountId ?? null,
    categoryId: input.categoryId,
    transactionType: input.transactionType,
    amountCents: input.amountCents,
    note: input.note?.trim() || null,
    intervalCount: input.intervalCount,
    intervalUnit: input.intervalUnit,
    startAt,
    nextRunAt,
    endAt,
    status: entry.status === "ended" ? "active" : entry.status,
    endedAt: entry.status === "ended" ? null : entry.endedAt,
    updatedAt: new Date(),
  }).where(eq(recurringEntries.id, id)).returning();
  return updated;
}

export async function endRecurringEntry(userId: string, id: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [entry] = await db.update(recurringEntries).set({ status: "ended", endedAt: new Date(), updatedAt: new Date() }).where(and(eq(recurringEntries.id, id), eq(recurringEntries.bookId, bookId), isNull(recurringEntries.archivedAt))).returning();
  return entry ?? null;
}

export async function archiveRecurringEntry(userId: string, id: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [entry] = await db.update(recurringEntries).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(recurringEntries.id, id), eq(recurringEntries.bookId, bookId), isNull(recurringEntries.archivedAt))).returning();
  return entry ?? null;
}

export async function runRecurringEntry(entryId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [entry] = await tx.select().from(recurringEntries).where(eq(recurringEntries.id, entryId)).limit(1);
    if (!entry || entry.status !== "active" || entry.archivedAt || entry.nextRunAt > now) return 0;
    let nextRunAt = entry.nextRunAt;
    let generated = 0;
    while (nextRunAt <= now && (!entry.endAt || nextRunAt <= entry.endAt) && generated < 24) {
      const [category] = await tx.select().from(categories).where(eq(categories.id, entry.categoryId)).limit(1);
      if (!category) break;
      const created = await tx.insert(transactions).values({
        bookId: entry.bookId,
        accountId: entry.accountId,
        categoryId: entry.categoryId,
        transactionType: entry.transactionType,
        amountCents: entry.amountCents,
        currency: entry.currency,
        occurredAt: nextRunAt,
        merchantName: category.name,
        note: entry.note,
        source: "recurring",
        recurringEntryId: entry.id,
        recurrenceScheduledFor: nextRunAt,
        createdBy: entry.createdBy,
      }).onConflictDoNothing().returning();
      if (created.length) generated += 1;
      nextRunAt = nextRecurringDate(nextRunAt, entry.startAt, entry.intervalCount, entry.intervalUnit as RecurringIntervalUnit);
    }
    const ended = Boolean(entry.endAt && nextRunAt > entry.endAt);
    await tx.update(recurringEntries).set({ nextRunAt, status: ended ? "ended" : "active", endedAt: ended ? now : entry.endedAt, updatedAt: now }).where(eq(recurringEntries.id, entry.id));
    return generated;
  });
}

export async function runDueRecurringEntriesForBook(bookId: string, now = new Date()) {
  const due = await db.select({ id: recurringEntries.id }).from(recurringEntries).where(and(eq(recurringEntries.bookId, bookId), eq(recurringEntries.status, "active"), isNull(recurringEntries.archivedAt), lte(recurringEntries.nextRunAt, now))).orderBy(asc(recurringEntries.nextRunAt)).limit(100);
  let generated = 0;
  for (const entry of due) generated += await runRecurringEntry(entry.id, now);
  return generated;
}

export async function getRecurringEntries(userId: string, status: "active" | "ended" = "active") {
  const bookId = await ensureDefaultLedger(userId);
  await runDueRecurringEntriesForBook(bookId);
  return db.select({
    id: recurringEntries.id, status: recurringEntries.status, transactionType: recurringEntries.transactionType, amountCents: recurringEntries.amountCents, note: recurringEntries.note,
    intervalCount: recurringEntries.intervalCount, intervalUnit: recurringEntries.intervalUnit, startAt: recurringEntries.startAt, nextRunAt: recurringEntries.nextRunAt, endAt: recurringEntries.endAt, accountId: recurringEntries.accountId, accountName: accounts.name,
    categoryId: categories.id, categoryName: categories.name, categoryIcon: categories.icon, categoryColor: categories.color,
  }).from(recurringEntries).innerJoin(categories, eq(recurringEntries.categoryId, categories.id)).leftJoin(accounts, eq(recurringEntries.accountId, accounts.id)).where(and(eq(recurringEntries.bookId, bookId), eq(recurringEntries.status, status), isNull(recurringEntries.archivedAt))).orderBy(status === "active" ? asc(recurringEntries.nextRunAt) : desc(recurringEntries.endedAt));
}

export async function getRecurringEntry(userId: string, id: string) {
  const bookId = await ensureDefaultLedger(userId);
  await runDueRecurringEntriesForBook(bookId);
  const [entry] = await db.select({
    id: recurringEntries.id, status: recurringEntries.status, transactionType: recurringEntries.transactionType, amountCents: recurringEntries.amountCents, note: recurringEntries.note, intervalCount: recurringEntries.intervalCount, intervalUnit: recurringEntries.intervalUnit, startAt: recurringEntries.startAt, nextRunAt: recurringEntries.nextRunAt, endAt: recurringEntries.endAt, accountId: recurringEntries.accountId, accountName: accounts.name,
    categoryId: categories.id, categoryName: categories.name, categoryIcon: categories.icon, categoryColor: categories.color,
  }).from(recurringEntries).innerJoin(categories, eq(recurringEntries.categoryId, categories.id)).leftJoin(accounts, eq(recurringEntries.accountId, accounts.id)).where(and(eq(recurringEntries.id, id), eq(recurringEntries.bookId, bookId), isNull(recurringEntries.archivedAt))).limit(1);
  if (!entry) return null;
  const generated = await db.select({ id: transactions.id, occurredAt: transactions.occurredAt, amountCents: transactions.amountCents, note: transactions.note }).from(transactions).where(and(eq(transactions.recurringEntryId, id), isNull(transactions.deletedAt))).orderBy(desc(transactions.occurredAt)).limit(50);
  return { ...entry, generated };
}

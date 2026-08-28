import { and, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { categories, transactions } from "@/features/ledger/schema";
import { ensureDefaultLedger } from "@/features/ledger/server";
import type {
  CategoryReportItem,
  LedgerReport,
  LedgerReportScope,
  ReportBucket,
  ReportScopeType,
  ReportTransaction,
} from "@/features/ledger/report-types";

const SHANGHAI_OFFSET = "+08:00";
const incomeColor = "#ff714b";
const expenseColor = "#28c5b4";

type ReportRow = {
  id: string;
  transactionType: string;
  amountCents: number;
  occurredAt: Date;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  parentId: string | null;
  parentName: string | null;
  parentIcon: string | null;
  parentColor: string | null;
};

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { year: value("year"), month: value("month"), day: value("day") };
}

function formatKey(date: Date, scope: ReportScopeType) {
  const { year, month, day } = localParts(date);
  if (scope === "month") return `${year}-${month}-${day}`;
  if (scope === "year") return `${year}-${month}`;
  return year;
}

function labelForKey(key: string, scope: ReportScopeType) {
  if (scope === "month") return `${Number(key.slice(5, 7))}月${Number(key.slice(8, 10))}日`;
  if (scope === "year") return `${key.slice(0, 4)}年${Number(key.slice(5, 7))}月`;
  return `${key}年`;
}

function boundsForKey(key: string, scope: ReportScopeType) {
  if (scope === "month") {
    const [year, month, day] = key.split("-").map(Number);
    const start = new Date(`${key}T00:00:00${SHANGHAI_OFFSET}`);
    const end = new Date(Date.UTC(year, month - 1, day + 1) - 8 * 60 * 60 * 1000);
    return { start, end };
  }
  if (scope === "year") {
    const [year, month] = key.split("-").map(Number);
    const start = new Date(`${key}-01T00:00:00${SHANGHAI_OFFSET}`);
    const end = new Date(Date.UTC(year, month, 1) - 8 * 60 * 60 * 1000);
    return { start, end };
  }
  const year = Number(key);
  return {
    start: new Date(`${year}-01-01T00:00:00${SHANGHAI_OFFSET}`),
    end: new Date(`${year + 1}-01-01T00:00:00${SHANGHAI_OFFSET}`),
  };
}

function trendKeys(scope: LedgerReportScope, firstAt: Date, end: Date) {
  if (scope.type === "month") {
    const [year, month] = scope.date!.split("-").map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, index) => `${scope.date}-${String(index + 1).padStart(2, "0")}`);
  }
  if (scope.type === "year") {
    return Array.from({ length: 12 }, (_, index) => `${scope.date}-${String(index + 1).padStart(2, "0")}`);
  }
  const firstYear = Number(localParts(firstAt).year);
  const lastYear = Number(localParts(end).year);
  return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index));
}

function scopeBounds(scope: LedgerReportScope, firstAt?: Date | null) {
  if (scope.type === "month") {
    const [year, month] = scope.date!.split("-").map(Number);
    return {
      start: new Date(`${scope.date}-01T00:00:00${SHANGHAI_OFFSET}`),
      end: new Date(Date.UTC(year, month, 1) - 8 * 60 * 60 * 1000),
    };
  }
  if (scope.type === "year") {
    const year = Number(scope.date);
    return {
      start: new Date(`${year}-01-01T00:00:00${SHANGHAI_OFFSET}`),
      end: new Date(`${year + 1}-01-01T00:00:00${SHANGHAI_OFFSET}`),
    };
  }
  return { start: firstAt ?? null, end: new Date() };
}

function makeCategoryItems(rows: ReportRow[], level: "major" | "minor", type: "expense" | "income") {
  const result = new Map<string, CategoryReportItem>();
  for (const row of rows) {
    if (row.transactionType !== type) continue;
    const useParent = type === "expense" && level === "major" && row.parentId;
    const id = useParent ? row.parentId! : row.categoryId;
    const name = useParent ? row.parentName : row.categoryName;
    if (!id || !name) continue;
    const current = result.get(id) ?? {
      id,
      name,
      icon: useParent ? row.parentIcon : row.categoryIcon,
      color: useParent ? row.parentColor ?? expenseColor : row.categoryColor ?? (type === "income" ? incomeColor : expenseColor),
      amountCents: 0,
      transactionCount: 0,
      percentage: 0,
    };
    current.amountCents += row.amountCents;
    current.transactionCount += 1;
    result.set(id, current);
  }
  const items = [...result.values()].sort((a, b) => b.amountCents - a.amountCents);
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  return items.map((item) => ({ ...item, percentage: total ? (item.amountCents / total) * 100 : 0 }));
}

async function reportRows(bookId: string, start: Date, end: Date) {
  const parent = alias(categories, "report_parent_category");
  return db.select({
    id: transactions.id, transactionType: transactions.transactionType, amountCents: transactions.amountCents,
    occurredAt: transactions.occurredAt, categoryId: transactions.categoryId, categoryName: categories.name,
    categoryIcon: categories.icon, categoryColor: categories.color, parentId: categories.parentId,
    parentName: parent.name, parentIcon: parent.icon, parentColor: parent.color,
  }).from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(and(eq(transactions.bookId, bookId), isNull(transactions.deletedAt), inArray(transactions.transactionType, ["income", "expense"]), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end)));
}

export async function getLedgerReport(userId: string, scope: LedgerReportScope): Promise<LedgerReport> {
  const bookId = await ensureDefaultLedger(userId);
  const [first] = await db.select({ occurredAt: transactions.occurredAt }).from(transactions)
    .where(and(eq(transactions.bookId, bookId), isNull(transactions.deletedAt), inArray(transactions.transactionType, ["income", "expense"]))).orderBy(transactions.occurredAt).limit(1);
  const range = scopeBounds(scope, first?.occurredAt);
  if (!range.start) return {
    scope, range: { startAt: null, endAt: null }, summary: { incomeCents: 0, expenseCents: 0, balanceCents: 0, incomeCount: 0, expenseCount: 0 }, trends: [],
    categories: { major: { expense: [], income: [] }, minor: { expense: [], income: [] } },
  };
  const rows = await reportRows(bookId, range.start, range.end);
  const trendMap = new Map<string, ReportBucket>();
  for (const row of rows) {
    const key = formatKey(row.occurredAt, scope.type);
    const bounds = boundsForKey(key, scope.type);
    const item = trendMap.get(key) ?? { key, label: labelForKey(key, scope.type), startAt: bounds.start.toISOString(), endAt: bounds.end.toISOString(), incomeCents: 0, expenseCents: 0, balanceCents: 0, incomeCount: 0, expenseCount: 0 };
    if (row.transactionType === "income") { item.incomeCents += row.amountCents; item.incomeCount += 1; }
    else { item.expenseCents += row.amountCents; item.expenseCount += 1; }
    item.balanceCents = item.incomeCents - item.expenseCents;
    trendMap.set(key, item);
  }
  const trends = trendKeys(scope, range.start, range.end).map((key) => {
    const existing = trendMap.get(key);
    if (existing) return existing;
    const bounds = boundsForKey(key, scope.type);
    return {
      key,
      label: labelForKey(key, scope.type),
      startAt: bounds.start.toISOString(),
      endAt: bounds.end.toISOString(),
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      incomeCount: 0,
      expenseCount: 0,
    };
  });
  const incomeCents = trends.reduce((sum, item) => sum + item.incomeCents, 0);
  const expenseCents = trends.reduce((sum, item) => sum + item.expenseCents, 0);
  const incomeCount = trends.reduce((sum, item) => sum + item.incomeCount, 0);
  const expenseCount = trends.reduce((sum, item) => sum + item.expenseCount, 0);
  return {
    scope, range: { startAt: range.start.toISOString(), endAt: range.end.toISOString() },
    summary: { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, incomeCount, expenseCount }, trends,
    categories: {
      major: { expense: makeCategoryItems(rows, "major", "expense"), income: makeCategoryItems(rows, "major", "income") },
      minor: { expense: makeCategoryItems(rows, "minor", "expense"), income: makeCategoryItems(rows, "minor", "income") },
    },
  };
}

export type LedgerTransactionsFilter = {
  start: Date; end: Date; types: ("income" | "expense")[]; categoryLevel?: "major" | "minor"; categoryId?: string; cursor?: Date; limit: number;
};

export async function getLedgerTransactions(userId: string, filter: LedgerTransactionsFilter) {
  const bookId = await ensureDefaultLedger(userId);
  const parent = alias(categories, "detail_parent_category");
  const clauses = [eq(transactions.bookId, bookId), isNull(transactions.deletedAt), gte(transactions.occurredAt, filter.start), lt(transactions.occurredAt, filter.end), inArray(transactions.transactionType, filter.types)];
  if (filter.cursor) clauses.push(lt(transactions.occurredAt, filter.cursor));
  if (filter.categoryId && filter.categoryLevel === "minor") clauses.push(eq(transactions.categoryId, filter.categoryId));
  if (filter.categoryId && filter.categoryLevel === "major") clauses.push(or(eq(transactions.categoryId, filter.categoryId), eq(categories.parentId, filter.categoryId))!);
  const rows = await db.select({
    id: transactions.id, transactionType: transactions.transactionType, amountCents: transactions.amountCents, occurredAt: transactions.occurredAt,
    merchantName: transactions.merchantName, note: transactions.note, accountId: transactions.accountId, categoryId: transactions.categoryId,
    categoryName: categories.name, categoryIcon: categories.icon, categoryColor: categories.color,
  }).from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id)).leftJoin(parent, eq(categories.parentId, parent.id))
    .where(and(...clauses)).orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(filter.limit + 1);
  const hasMore = rows.length > filter.limit;
  const items: ReportTransaction[] = rows.slice(0, filter.limit).map((row) => ({
    ...row,
    occurredAt: row.occurredAt.toISOString(),
    transactionType: row.transactionType as "income" | "expense",
  }));
  return { items, nextCursor: hasMore ? items.at(-1)?.occurredAt ?? null : null };
}

import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ensureDefaultLedger } from "@/features/ledger/server";
import { accounts, categories, importBatches, importRows, transactions } from "@/features/ledger/schema";

export type ImportSource = "wechat" | "alipay" | "generic";
export type ImportDirection = "income" | "expense" | "unknown";

export type ImportCandidate = {
  clientKey: string;
  rowNumber: number;
  occurredAt: string;
  merchantName: string;
  amountCents: number;
  direction: ImportDirection;
  categoryId: string | null;
  accountId: string | null;
  note: string;
  externalTransactionId: string | null;
  enabled: boolean;
};

function clean(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function sourceRowHash(source: ImportSource, row: Pick<ImportCandidate, "occurredAt" | "merchantName" | "amountCents" | "direction" | "note">) {
  return createHash("sha256").update([source, clean(row.occurredAt), clean(row.merchantName), row.amountCents, row.direction, clean(row.note)].join("|"), "utf8").digest("hex");
}

function validSource(source: string): source is ImportSource {
  return source === "wechat" || source === "alipay" || source === "generic";
}

function validateDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function existingKeys(bookId: string, source: ImportSource, rows: ImportCandidate[]) {
  const orderIds = [...new Set(rows.map((row) => clean(row.externalTransactionId)).filter(Boolean))];
  const hashes = [...new Set(rows.map((row) => sourceRowHash(source, row)))];
  if (!orderIds.length && !hashes.length) return { orderIds: new Set<string>(), hashes: new Set<string>() };
  const matches = await db.select({ externalTransactionId: transactions.externalTransactionId, sourceRowHash: transactions.sourceRowHash })
    .from(transactions)
    .where(and(eq(transactions.bookId, bookId), eq(transactions.source, source), isNull(transactions.deletedAt), or(orderIds.length ? inArray(transactions.externalTransactionId, orderIds) : undefined, hashes.length ? inArray(transactions.sourceRowHash, hashes) : undefined)));
  return { orderIds: new Set(matches.map((row) => row.externalTransactionId).filter((value): value is string => Boolean(value))), hashes: new Set(matches.map((row) => row.sourceRowHash).filter((value): value is string => Boolean(value))) };
}

export async function checkImportRows(userId: string, source: ImportSource, rows: ImportCandidate[]) {
  const bookId = await ensureDefaultLedger(userId);
  const existing = await existingKeys(bookId, source, rows);
  const seenOrders = new Set<string>();
  const seenHashes = new Set<string>();
  return rows.map((row) => {
    const orderId = clean(row.externalTransactionId);
    const hash = sourceRowHash(source, row);
    const duplicate = orderId ? existing.orderIds.has(orderId) || seenOrders.has(orderId) : existing.hashes.has(hash) || seenHashes.has(hash);
    if (orderId) seenOrders.add(orderId); else seenHashes.add(hash);
    return { clientKey: row.clientKey, duplicate };
  });
}

async function validCategory(bookId: string, row: ImportCandidate) {
  if (row.direction !== "income" && row.direction !== "expense") return null;
  if (!row.categoryId) return null;
  const [category] = await db.select().from(categories).where(and(eq(categories.id, row.categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!category || category.kind !== row.direction) return null;
  if ((row.direction === "expense" && !category.parentId) || (row.direction === "income" && category.parentId)) return null;
  return category;
}

export async function confirmImport(userId: string, input: { source: ImportSource; filename: string; rows: ImportCandidate[] }) {
  if (!validSource(input.source)) throw new Error("账单来源不正确。");
  if (!input.rows.length || input.rows.length > 500) throw new Error("一次最多确认导入 500 笔。请拆分账单后重试。");
  const bookId = await ensureDefaultLedger(userId);
  const rows = input.rows.slice(0, 500);
  const existing = await existingKeys(bookId, input.source, rows);
  const accountIds = [...new Set(rows.map((row) => row.accountId).filter((value): value is string => Boolean(value)))];
  const accountRows = accountIds.length ? await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.bookId, bookId), inArray(accounts.id, accountIds))) : [];
  const validAccountIds = new Set(accountRows.map((row) => row.id));

  return db.transaction(async (tx) => {
    const [batch] = await tx.insert(importBatches).values({ userId, bookId, source: input.source, originalFilename: clean(input.filename) || null, status: "processing", totalRows: rows.length }).returning();
    let imported = 0; let duplicates = 0; let skipped = 0;
    const seenOrders = new Set<string>(); const seenHashes = new Set<string>();
    for (const row of rows) {
      let decision = "skipped"; let reason: string | null = null; let transactionId: string | null = null;
      const occurredAt = validateDate(row.occurredAt);
      const orderId = clean(row.externalTransactionId) || null;
      const hash = sourceRowHash(input.source, row);
      const duplicate = orderId ? existing.orderIds.has(orderId) || seenOrders.has(orderId) : existing.hashes.has(hash) || seenHashes.has(hash);
      if (orderId) seenOrders.add(orderId); else seenHashes.add(hash);
      if (!row.enabled) { reason = "用户跳过"; skipped += 1; }
      else if (duplicate) { decision = "duplicate"; reason = "重复流水"; duplicates += 1; }
      else if (!occurredAt || !clean(row.merchantName) || !Number.isInteger(row.amountCents) || row.amountCents <= 0) { reason = "时间、商户或金额不正确"; skipped += 1; }
      else if (row.accountId && !validAccountIds.has(row.accountId)) { reason = "账户不属于当前账本"; skipped += 1; }
      else {
        const category = await validCategory(bookId, row);
        if (!category) { reason = "请选择有效的收支分类"; skipped += 1; }
        else {
          const [transaction] = await tx.insert(transactions).values({
            bookId, accountId: row.accountId ?? null, categoryId: category.id, transactionType: row.direction,
            amountCents: row.amountCents, occurredAt, merchantName: clean(row.merchantName), note: clean(row.note) || null,
            source: input.source, externalTransactionId: orderId, sourceRowHash: hash, importBatchId: batch.id, createdBy: userId,
          }).onConflictDoNothing().returning();
          if (transaction) { decision = "imported"; transactionId = transaction.id; imported += 1; }
          else { decision = "duplicate"; reason = "重复流水"; duplicates += 1; }
        }
      }
      await tx.insert(importRows).values({ batchId: batch.id, transactionId, rowNumber: row.rowNumber, decision, reason, rawMetadata: { merchantName: row.merchantName, occurredAt: row.occurredAt, amountCents: row.amountCents, direction: row.direction, externalTransactionId: orderId } });
    }
    await tx.update(importBatches).set({ status: "completed", importedRows: imported, skippedDuplicateRows: duplicates }).where(eq(importBatches.id, batch.id));
    return { batchId: batch.id, imported, duplicates, skipped };
  });
}

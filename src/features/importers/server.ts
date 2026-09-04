import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { db } from "@/lib/db/client";
import { ensureDefaultLedger } from "@/features/ledger/server";
import { accounts, categories, importBatches, importCategoryRules, importRows, transactions } from "@/features/ledger/schema";
import { suggestImportCategory } from "@/features/importers/suggest-category";

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
  platformCategory?: string;
  productName?: string;
};

export type ImportRuleInput = {
  pattern: string;
  matchType: "exact" | "contains";
  direction: "expense" | "income" | "any";
  categoryId: string;
  priority?: number;
  enabled?: boolean;
};

function clean(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeRuleText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function validRuleInput(input: ImportRuleInput) {
  const pattern = clean(input.pattern);
  if (!pattern || pattern.length > 80) throw new Error("规则关键词需为 1 到 80 个字符。");
  if (!["exact", "contains"].includes(input.matchType)) throw new Error("规则匹配方式不正确。");
  if (!["expense", "income", "any"].includes(input.direction)) throw new Error("规则收支类型不正确。");
  return { ...input, pattern, priority: Math.max(0, Math.min(1000, Math.trunc(input.priority ?? 0))), enabled: input.enabled ?? true };
}

async function getImportRules(bookId: string) {
  return db.select().from(importCategoryRules).where(and(eq(importCategoryRules.bookId, bookId), eq(importCategoryRules.enabled, true))).orderBy(desc(importCategoryRules.priority), desc(importCategoryRules.updatedAt));
}

function ruleMatches(rule: typeof importCategoryRules.$inferSelect, row: ImportCandidate) {
  if (rule.direction !== "any" && rule.direction !== row.direction) return false;
  if (row.direction === "unknown") return false;
  const pattern = normalizeRuleText(rule.pattern);
  const text = normalizeRuleText(`${row.merchantName} ${row.productName ?? ""}`);
  return rule.matchType === "exact" ? normalizeRuleText(row.merchantName) === pattern : text.includes(pattern);
}

async function suggestWithAi(rows: ImportCandidate[], bookCategories: { id: string; name: string; kind: string; parentId: string | null }[]) {
  if (process.env.IMPORT_AI_ENABLED !== "true" || !process.env.AI_GATEWAY_API_KEY || !rows.length) return new Map<string, { categoryId: string; confidence: number; source: "ai" }>();
  const maxMerchants = Math.max(1, Number(process.env.IMPORT_AI_MAX_UNIQUE_MERCHANTS ?? 60));
  const unique = [...new Map(rows.map((row) => [`${row.direction}|${normalizeRuleText(row.merchantName)}|${normalizeRuleText(row.platformCategory)}`, row])).values()].slice(0, maxMerchants);
  const selectableCategories = bookCategories.filter((category) => category.kind === "income" ? !category.parentId : Boolean(category.parentId));
  const categoriesForPrompt = selectableCategories.map((category, index) => [`c${index}`, category.name] as const);
  const categoryMap = new Map<string, { id: string; name: string; kind: string; parentId: string | null }>(categoriesForPrompt.map(([shortId], index) => [shortId, selectableCategories[index]]));
  if (!categoriesForPrompt.length) return new Map();
  const input = unique.map((row, index) => ({ key: `m${index}`, direction: row.direction, merchant: clean(row.merchantName).slice(0, 60), description: clean(row.productName).slice(0, 80), platform: clean(row.platformCategory).slice(0, 30) }));
  const model = process.env.IMPORT_AI_MODEL ?? "openai/gpt-4o-mini";
  const logAi = process.env.IMPORT_AI_LOG === "true";
  try {
    const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
    const prompt = `为每条账单选择最合适的候选分类。只能使用候选分类 ID；无法确定时 category=null。\n只返回一个紧凑 JSON 对象，不要 Markdown、解释或额外文字，格式必须是：{"items":[{"key":"m0","category":"c0","confidence":0.92}]}。confidence 是 0 到 1 的数字。\n候选分类:${JSON.stringify(categoriesForPrompt)}\n账单:${JSON.stringify(input)}`;
    if (logAi) console.info("[import-ai] request", { model, merchants: input });
    const result = await generateText({
      model: gateway.languageModel(model),
      prompt,
      maxOutputTokens: Math.min(2000, 400 + unique.length * 80),
      temperature: 0,
    });
    const rawText = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed: unknown = JSON.parse(rawText);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items)) throw new Error("AI 返回的 JSON 格式不正确");
    const items = (parsed as { items: unknown[] }).items.filter((item): item is { key: string; category: string | null; confidence: number } => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return typeof value.key === "string" && (typeof value.category === "string" || value.category === null) && typeof value.confidence === "number" && value.confidence >= 0 && value.confidence <= 1;
    });
    if (logAi) {
      console.info("[import-ai] response", { finishReason: result.finishReason, text: rawText, itemCount: items.length });
    }
    const suggestions = new Map<string, { categoryId: string; confidence: number; source: "ai" }>();
    for (const item of items) {
      const category = item.category ? categoryMap.get(item.category) : null;
      const rowIndex = /^m\d+$/.test(item.key) ? Number(item.key.slice(1)) : -1;
      const row = unique[rowIndex];
      if (logAi) {
        console.info("[import-ai] mapping", {
          key: item.key,
          merchant: row?.merchantName ?? null,
          returnedCategory: item.category,
          mappedCategory: category?.name ?? null,
          confidence: item.confidence,
          accepted: Boolean(category && row && item.confidence >= 0.85),
        });
      }
      if (category && row && item.confidence >= 0.85) suggestions.set(`${row.direction}|${normalizeRuleText(row.merchantName)}|${normalizeRuleText(row.platformCategory)}`, { categoryId: category.id, confidence: item.confidence, source: "ai" });
    }
    return suggestions;
  } catch (error) {
    if (logAi) console.warn("[import-ai] error", error instanceof Error ? error.message : error);
    console.warn("[import-ai] classification unavailable", error instanceof Error ? error.message : error);
    return new Map();
  }
}

export async function listImportRules(userId: string) {
  const bookId = await ensureDefaultLedger(userId);
  return db.select({ id: importCategoryRules.id, pattern: importCategoryRules.pattern, matchType: importCategoryRules.matchType, direction: importCategoryRules.direction, categoryId: importCategoryRules.categoryId, categoryName: categories.name, priority: importCategoryRules.priority, enabled: importCategoryRules.enabled }).from(importCategoryRules).innerJoin(categories, eq(importCategoryRules.categoryId, categories.id)).where(eq(importCategoryRules.bookId, bookId)).orderBy(desc(importCategoryRules.priority), desc(importCategoryRules.updatedAt));
}

export async function createImportRule(userId: string, input: ImportRuleInput) {
  const bookId = await ensureDefaultLedger(userId);
  const value = validRuleInput(input);
  const [category] = await db.select().from(categories).where(and(eq(categories.id, value.categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!category || (value.direction !== "any" && category.kind !== value.direction) || (category.kind === "expense" && !category.parentId) || (category.kind === "income" && category.parentId)) throw new Error("规则分类无效。");
  const [rule] = await db.insert(importCategoryRules).values({ bookId, pattern: value.pattern, matchType: value.matchType, direction: value.direction, categoryId: category.id, priority: value.priority, enabled: value.enabled }).returning();
  return rule;
}

export async function updateImportRule(userId: string, id: string, input: ImportRuleInput) {
  const bookId = await ensureDefaultLedger(userId);
  const value = validRuleInput(input);
  const [category] = await db.select().from(categories).where(and(eq(categories.id, value.categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!category || (value.direction !== "any" && category.kind !== value.direction) || (category.kind === "expense" && !category.parentId) || (category.kind === "income" && category.parentId)) throw new Error("规则分类无效。");
  const [rule] = await db.update(importCategoryRules).set({ pattern: value.pattern, matchType: value.matchType, direction: value.direction, categoryId: category.id, priority: value.priority, enabled: value.enabled, updatedAt: new Date() }).where(and(eq(importCategoryRules.id, id), eq(importCategoryRules.bookId, bookId))).returning();
  return rule ?? null;
}

export async function deleteImportRule(userId: string, id: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [rule] = await db.delete(importCategoryRules).where(and(eq(importCategoryRules.id, id), eq(importCategoryRules.bookId, bookId))).returning();
  return rule ?? null;
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
  const [rules, bookCategories] = await Promise.all([
    getImportRules(bookId),
    db.select({ id: categories.id, name: categories.name, kind: categories.kind, parentId: categories.parentId }).from(categories).where(and(eq(categories.bookId, bookId), isNull(categories.archivedAt))),
  ]);
  const suggestions = new Map<string, { categoryId: string; source: "user_rule" | "ai"; confidence: number }>();
  const unresolved: ImportCandidate[] = [];
  const localCategories = bookCategories.filter((category): category is typeof category & { kind: "expense" | "income" } => category.kind === "expense" || category.kind === "income");
  for (const row of rows) {
    const rule = rules.find((item) => ruleMatches(item, row));
    if (rule) suggestions.set(row.clientKey, { categoryId: rule.categoryId, source: "user_rule", confidence: 1 });
    else {
      const local = suggestImportCategory(row, localCategories);
      if (local.categoryId) suggestions.set(row.clientKey, { categoryId: local.categoryId, source: local.source === "platform" || local.source === "keyword" ? "user_rule" : "ai", confidence: 1 });
      else if (!row.categoryId) unresolved.push(row);
    }
  }
  const aiSuggestions = await suggestWithAi(unresolved, bookCategories);
  for (const row of unresolved) {
    const key = `${row.direction}|${normalizeRuleText(row.merchantName)}|${normalizeRuleText(row.platformCategory)}`;
    const suggestion = aiSuggestions.get(key);
    if (suggestion) suggestions.set(row.clientKey, suggestion);
  }
  const seenOrders = new Set<string>();
  const seenHashes = new Set<string>();
  return rows.map((row) => {
    const orderId = clean(row.externalTransactionId);
    const hash = sourceRowHash(source, row);
    const duplicate = orderId ? existing.orderIds.has(orderId) || seenOrders.has(orderId) : existing.hashes.has(hash) || seenHashes.has(hash);
    if (orderId) seenOrders.add(orderId); else seenHashes.add(hash);
    const suggestion = suggestions.get(row.clientKey);
    return { clientKey: row.clientKey, duplicate, categoryId: suggestion?.categoryId ?? null, categorySuggestion: suggestion?.source ?? null, categoryConfidence: suggestion?.confidence ?? null };
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

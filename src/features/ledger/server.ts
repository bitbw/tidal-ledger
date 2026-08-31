import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  bookMembers,
  books,
  categories,
  transactions,
} from "@/features/ledger/schema";
import {
  defaultExpenseCategories,
  defaultIncomeCategories,
} from "@/features/ledger/default-categories";

export type TransactionInput = {
  transactionType: "expense" | "income";
  amountCents: number;
  categoryId: string;
  note?: string;
  occurredAt?: string;
};

export type CategoryInput = {
  name: string;
  kind: "expense" | "income";
  parentId?: string | null;
  icon?: string | null;
  color?: string;
};

async function ensureDefaultCategories(bookId: string) {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(categories)
      .where(eq(categories.bookId, bookId));
    const current = [...rows];
    const find = (kind: string, name: string, parentId: string | null) =>
      current.find(
        (category) =>
          category.kind === kind &&
          category.name === name &&
          category.parentId === parentId,
      );

    for (const [groupIndex, group] of defaultExpenseCategories.entries()) {
      let parent = find("expense", group.name, null);
      if (!parent) {
        [parent] = await tx
          .insert(categories)
          .values({
            bookId,
            name: group.name,
            kind: "expense",
            icon: group.icon,
            sortOrder: groupIndex + 1,
            isSystem: true,
          })
          .returning();
        current.push(parent);
      }

      for (const [childIndex, child] of group.children.entries()) {
        let item = find("expense", child.name, parent.id);
        if (!item) {
          // Reuse old flat default categories so existing transactions retain
          // their category IDs while gaining the correct parent category.
          const oldFlat = current.find(
            (category) =>
              category.kind === "expense" &&
              category.name === child.name &&
              category.parentId === null &&
              category.id !== parent.id,
          );
          if (oldFlat) {
            [item] = await tx
              .update(categories)
              .set({
                parentId: parent.id,
                icon: oldFlat.icon ?? child.icon,
                sortOrder: childIndex + 1,
                updatedAt: new Date(),
              })
              .where(eq(categories.id, oldFlat.id))
              .returning();
            const index = current.findIndex(
              (category) => category.id === oldFlat.id,
            );
            current[index] = item;
          } else {
            [item] = await tx
              .insert(categories)
              .values({
                bookId,
                name: child.name,
                kind: "expense",
                parentId: parent.id,
                icon: child.icon,
                sortOrder: childIndex + 1,
                isSystem: true,
              })
              .returning();
            current.push(item);
          }
        }
      }
    }

    for (const [index, category] of defaultIncomeCategories.entries()) {
      if (find("income", category.name, null)) continue;
      const [created] = await tx
        .insert(categories)
        .values({
          bookId,
          name: category.name,
          kind: "income",
          icon: category.icon,
          color: "#ff714b",
          sortOrder: index + 1,
          isSystem: true,
        })
        .returning();
      current.push(created);
    }
  });
}

export async function ensureDefaultLedger(userId: string) {
  const existing = await db.query.bookMembers.findFirst({
    where: eq(bookMembers.userId, userId),
    with: {},
  });
  if (existing) {
    await ensureDefaultCategories(existing.bookId);
    return existing.bookId;
  }

  const bookId = await db.transaction(async (tx) => {
    const again = await tx.query.bookMembers.findFirst({
      where: eq(bookMembers.userId, userId),
    });
    if (again) return again.bookId;
    const [book] = await tx.insert(books).values({ name: "日常账本" }).returning();
    await tx
      .insert(bookMembers)
      .values({ bookId: book.id, userId, role: "owner" });
    await tx.insert(accounts).values([
      { bookId: book.id, name: "微信支付", accountType: "wallet", color: "#28c5b4" },
      { bookId: book.id, name: "支付宝", accountType: "wallet", color: "#5579de" },
      { bookId: book.id, name: "现金", accountType: "cash", color: "#f49a5d" },
    ]);
    return book.id;
  });
  await ensureDefaultCategories(bookId);
  return bookId;
}

async function getTransactionCategory(
  bookId: string,
  transactionType: TransactionInput["transactionType"],
  categoryId: string,
) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.bookId, bookId),
        isNull(categories.archivedAt),
      ),
    )
    .limit(1);
  if (!category || category.kind !== transactionType) {
    throw new Error("分类不存在或不属于当前收支类型。");
  }
  if (
    (transactionType === "expense" && !category.parentId) ||
    (transactionType === "income" && category.parentId)
  ) {
    throw new Error("请选择可记账的分类。");
  }
  return category;
}

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function validateCategoryInput(
  bookId: string,
  input: CategoryInput,
  excludedId?: string,
) {
  const name = normalizeCategoryName(input.name);
  if (!name || name.length > 30) throw new Error("分类名称需为 1 到 30 个字符。");
  const parentId = input.parentId ?? null;
  if (input.kind === "income" && parentId) {
    throw new Error("收入分类不支持所属大类。");
  }
  if (input.kind === "expense" && parentId) {
    const [parent] = await db.select().from(categories).where(and(eq(categories.id, parentId), eq(categories.bookId, bookId), eq(categories.kind, "expense"), isNull(categories.archivedAt))).limit(1);
    if (!parent || parent.parentId) throw new Error("所属支出大类不存在。");
  }
  const siblings = await db.select().from(categories).where(and(eq(categories.bookId, bookId), eq(categories.kind, input.kind), isNull(categories.archivedAt)));
  const duplicate = siblings.find((category) => category.id !== excludedId && category.parentId === parentId && category.name === name);
  if (duplicate) throw new Error("同一层级下已存在同名分类。");
  return { name, parentId };
}

export async function createLedgerCategory(userId: string, input: CategoryInput) {
  const bookId = await ensureDefaultLedger(userId);
  const { name, parentId } = await validateCategoryInput(bookId, input);
  const rows = await db.select({ sortOrder: categories.sortOrder }).from(categories).where(and(eq(categories.bookId, bookId), eq(categories.kind, input.kind), parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId))).orderBy(desc(categories.sortOrder)).limit(1);
  const [category] = await db.insert(categories).values({
    bookId,
    name,
    kind: input.kind,
    parentId,
    icon: input.icon ?? (input.kind === "income" ? "badge-plus" : "shopping-bag"),
    color: input.color ?? (input.kind === "income" ? "#ff714b" : "#28c5b4"),
    sortOrder: (rows[0]?.sortOrder ?? 0) + 1,
  }).returning();
  return category;
}

export async function updateLedgerCategory(
  userId: string,
  categoryId: string,
  input: CategoryInput,
) {
  const bookId = await ensureDefaultLedger(userId);
  const [existing] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!existing) return null;
  if (existing.kind !== input.kind) throw new Error("分类类型不能直接变更。");
  const { name, parentId } = await validateCategoryInput(bookId, input, categoryId);
  if (existing.parentId === null && parentId && input.kind === "expense") {
    const children = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.parentId, existing.id), isNull(categories.archivedAt))).limit(1);
    if (children.length) throw new Error("含有小类的支出大类不能改为小类。");
  }
  const [category] = await db.update(categories).set({ name, parentId, icon: input.icon ?? existing.icon, color: input.color ?? existing.color, updatedAt: new Date() }).where(eq(categories.id, categoryId)).returning();
  return category;
}

export async function archiveLedgerCategory(userId: string, categoryId: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [existing] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.bookId, bookId), isNull(categories.archivedAt))).limit(1);
  if (!existing) return null;
  if (existing.kind === "expense" && !existing.parentId) {
    const child = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.parentId, existing.id), isNull(categories.archivedAt))).limit(1);
    if (child.length) throw new Error("请先归档该大类下的小类。");
  }
  const [category] = await db.update(categories).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(categories.id, categoryId)).returning();
  return category;
}

export async function getLedger(userId: string) {
  const bookId = await ensureDefaultLedger(userId);
  const [[book], accountRows, categoryRows, transactionRows] = await Promise.all([
    db.select().from(books).where(eq(books.id, bookId)).limit(1),
    db.select().from(accounts).where(eq(accounts.bookId, bookId)).orderBy(accounts.createdAt),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.bookId, bookId), isNull(categories.archivedAt)))
      .orderBy(categories.kind, categories.sortOrder, categories.name),
    db
      .select({
        id: transactions.id,
        transactionType: transactions.transactionType,
        amountCents: transactions.amountCents,
        occurredAt: transactions.occurredAt,
        merchantName: transactions.merchantName,
        note: transactions.note,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.bookId, bookId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.occurredAt))
      .limit(300),
  ]);
  return { book, accounts: accountRows, categories: categoryRows, transactions: transactionRows };
}

export async function createLedgerTransaction(userId: string, input: TransactionInput) {
  const bookId = await ensureDefaultLedger(userId);
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.bookId, bookId))
    .orderBy(accounts.createdAt)
    .limit(1);
  const category = await getTransactionCategory(bookId, input.transactionType, input.categoryId);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("记账时间不正确。");
  const [transaction] = await db
    .insert(transactions)
    .values({
      bookId,
      accountId: account?.id ?? null,
      categoryId: category.id,
      transactionType: input.transactionType,
      amountCents: input.amountCents,
      occurredAt,
      merchantName: category.name,
      note: input.note ?? null,
      source: "manual",
      createdBy: userId,
    })
    .returning();
  return transaction;
}

export async function updateLedgerTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput,
) {
  const bookId = await ensureDefaultLedger(userId);
  const category = await getTransactionCategory(bookId, input.transactionType, input.categoryId);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : null;
  if (input.occurredAt && occurredAt && Number.isNaN(occurredAt.getTime())) throw new Error("记账时间不正确。");
  const [transaction] = await db
    .update(transactions)
    .set({
      transactionType: input.transactionType,
      amountCents: input.amountCents,
      ...(occurredAt ? { occurredAt } : {}),
      categoryId: category.id,
      merchantName: category.name,
      note: input.note ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, transactionId), eq(transactions.bookId, bookId), isNull(transactions.deletedAt)))
    .returning();
  return transaction ?? null;
}

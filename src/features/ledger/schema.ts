import { relations } from "drizzle-orm";
import { bigint, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "@/lib/auth/schema";

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("CNY"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookMembers = pgTable("book_members", {
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("book_members_book_user_idx").on(table.bookId, table.userId), index("book_members_user_idx").on(table.userId)]);

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  accountType: text("account_type").notNull().default("cash"),
  openingBalanceCents: bigint("opening_balance_cents", { mode: "number" }).notNull().default(0),
  color: text("color").notNull().default("#28c5b4"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  icon: text("icon"),
  color: text("color").notNull().default("#28c5b4"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  originalFilename: text("original_filename"),
  fileFingerprint: text("file_fingerprint"),
  status: text("status").notNull().default("preview"),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  skippedDuplicateRows: integer("skipped_duplicate_rows").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  transactionType: text("transaction_type").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("CNY"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  merchantName: text("merchant_name"),
  note: text("note"),
  source: text("source").notNull().default("manual"),
  externalTransactionId: text("external_transaction_id"),
  sourceRowHash: text("source_row_hash"),
  importBatchId: uuid("import_batch_id").references(() => importBatches.id, { onDelete: "set null" }),
  transferPairId: uuid("transfer_pair_id"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("transactions_book_occurred_idx").on(table.bookId, table.occurredAt),
  uniqueIndex("transactions_external_id_idx").on(table.bookId, table.source, table.externalTransactionId),
]);

export const importRows = pgTable("import_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  rowNumber: integer("row_number").notNull(),
  decision: text("decision").notNull(),
  reason: text("reason"),
  rawMetadata: jsonb("raw_metadata").notNull().default({}),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
  yearMonth: text("year_month").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookRelations = relations(books, ({ many }) => ({ members: many(bookMembers), accounts: many(accounts), entries: many(transactions) }));
export const transactionRelations = relations(transactions, ({ one }) => ({ book: one(books, { fields: [transactions.bookId], references: [books.id] }) }));

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CategoryPickerSheet, categoryIcon } from "@/features/ledger/category-picker-sheet";
import type { LedgerCategory } from "@/features/ledger/use-ledger";

export type ImportPreviewRow = {
  clientKey: string;
  rowNumber: number;
  occurredAt: string;
  merchantName: string;
  productName: string;
  amountCents: number;
  direction: "expense" | "income" | "unknown";
  categoryId: string | null;
  accountId: string | null;
  note: string;
  externalTransactionId: string | null;
  enabled: boolean;
  duplicate: boolean;
  error: string | null;
  categorySuggestion?: "user_rule" | "platform" | "keyword" | "ai" | null;
};

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace(" ", "T").slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ImportPreviewEditor({ row, categories, accounts, onChange, onSaveRule, onCategoryAdmin }: { row: ImportPreviewRow; categories: LedgerCategory[]; accounts: { id: string; name: string; color: string }[]; onChange: (patch: Partial<ImportPreviewRow>) => void; onSaveRule?: () => Promise<void>; onCategoryAdmin?: (mode: "manage" | "new", row: ImportPreviewRow, parentId: string | null) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleSaved, setRuleSaved] = useState(false);
  const invalid = row.direction === "unknown" || !row.categoryId || !row.occurredAt || row.amountCents <= 0;
  const selectedCategory = categories.find((category) => category.id === row.categoryId);
  const CategoryIcon = selectedCategory ? categoryIcon(selectedCategory.icon) : null;
  const timeLabel = localDateTime(row.occurredAt).replace("T", " ").slice(5, 16);

  return <section className={`rounded-2xl border shadow-sm ${row.duplicate ? "border-[#efd5c9] bg-[#fff9f6]" : invalid && row.enabled ? "border-[#f1d38b] bg-[#fffdf5]" : "border-[#e8eeee] bg-white"}`}>
    <div className="flex items-center gap-3 p-3">
      <label className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef5f4]">
        <input type="checkbox" checked={row.enabled} disabled={row.duplicate} onChange={(event) => onChange({ enabled: event.target.checked })} className="size-5 accent-[#0c6f78]" />
        <span className="sr-only">导入该笔流水</span>
      </label>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-[#303b44]">{row.merchantName || "未识别商户"}</span>
          {row.duplicate && <span className="shrink-0 rounded-full bg-[#fff0eb] px-2 py-0.5 text-[10px] font-bold text-[#d55a3e]">重复</span>}
          {!row.duplicate && invalid && row.enabled && <span className="shrink-0 rounded-full bg-[#fff5d9] px-2 py-0.5 text-[10px] font-bold text-[#9b741b]">待完善</span>}
          {!row.enabled && !row.duplicate && <span className="shrink-0 rounded-full bg-[#f0f2f2] px-2 py-0.5 text-[10px] text-[#7b858d]">已跳过</span>}
        </span>
        <span className="mt-1 block truncate text-xs text-[#7d8792]">
          {row.productName || `第 ${row.rowNumber} 行`} · {timeLabel}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-[#7d8792]">
          <span className={`shrink-0 ${row.direction === "income" ? "text-[#ff714b]" : row.direction === "expense" ? "text-[#0c6f78]" : "text-[#9a7a24]"}`}>
            {row.direction === "income" ? "收入" : row.direction === "expense" ? "支出" : "待确认"}
          </span>
          <span className="shrink-0">·</span>
          <span className="flex min-w-0 shrink items-center gap-1 truncate">
            {CategoryIcon && <CategoryIcon size={12} className={row.direction === "income" ? "text-[#ff714b]" : "text-[#0c6f78]"} />}
            <span className="truncate">{selectedCategory?.name ?? "未分类"}</span>
          </span>
        </span>
      </button>
      <b className="money shrink-0 text-base">¥{(row.amountCents / 100).toFixed(2)}</b>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "收起流水编辑" : "编辑流水"} className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f3f6f6] text-[#65717d]">
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
    </div>

    {expanded && <div className="border-t border-[#edf0f0] px-3 pb-3 pt-2">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="text-xs font-medium text-[#71808b]">时间<input value={localDateTime(row.occurredAt)} onChange={(event) => onChange({ occurredAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} type="datetime-local" disabled={row.duplicate} className="mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-sm text-[#303b44] outline-none" /></label>
        <label className="text-xs font-medium text-[#71808b]">金额<input value={(row.amountCents / 100).toFixed(2)} onChange={(event) => { const cents = Math.round(Number(event.target.value || 0) * 100); onChange({ amountCents: Number.isFinite(cents) ? cents : 0 }); }} inputMode="decimal" disabled={row.duplicate} className="money mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-base font-bold text-[#303b44] outline-none" /></label>
      </div>
      <div className="mt-2.5 grid grid-cols-3 rounded-xl bg-[#edf2f2] p-1"><button type="button" disabled={row.duplicate} onClick={() => { setActiveParentId(null); onChange({ direction: "expense", categoryId: row.direction === "expense" ? row.categoryId : null, error: null }); }} className={`rounded-lg py-2 text-sm font-bold ${row.direction === "expense" ? "bg-white text-[#0c6f78] shadow-sm" : "text-[#86919a]"}`}>支出</button><button type="button" disabled={row.duplicate} onClick={() => { setActiveParentId(null); onChange({ direction: "income", categoryId: row.direction === "income" ? row.categoryId : null, error: null }); }} className={`rounded-lg py-2 text-sm font-bold ${row.direction === "income" ? "bg-white text-[#ff714b] shadow-sm" : "text-[#86919a]"}`}>收入</button><button type="button" disabled={row.duplicate} onClick={() => onChange({ direction: "unknown", categoryId: null })} className={`rounded-lg py-2 text-sm font-bold ${row.direction === "unknown" ? "bg-white text-[#9a7a24] shadow-sm" : "text-[#86919a]"}`}>待确认</button></div>
      <button type="button" onClick={() => setPickerOpen(true)} disabled={row.duplicate || row.direction === "unknown"} className={`mt-2.5 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${selectedCategory ? "border-[#bce5df] bg-[#effaf8]" : "border-[#e2e8e8] bg-[#f8fbfb]"}`}><span><small className="block text-[11px] text-[#84909a]">分类{row.categorySuggestion && selectedCategory ? ` · ${row.categorySuggestion === "ai" ? "AI推荐" : row.categorySuggestion === "user_rule" ? "用户规则" : "自动推荐"}` : ""}</small><b className={`mt-0.5 block text-sm ${selectedCategory ? "text-[#0c6f78]" : "text-[#76818b]"}`}>{selectedCategory?.name ?? "点击选择分类"}</b></span><span className="grid size-8 place-items-center rounded-full bg-white text-lg text-[#58716f]">›</span></button>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5"><label className="text-xs font-medium text-[#71808b]">账户<select value={row.accountId ?? ""} onChange={(event) => onChange({ accountId: event.target.value || null })} disabled={row.duplicate} className="mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-sm text-[#303b44] outline-none"><option value="">不指定</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="text-xs font-medium text-[#71808b]">备注<input value={row.note} onChange={(event) => onChange({ note: event.target.value })} disabled={row.duplicate} placeholder="可选" className="mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-sm text-[#303b44] outline-none" /></label></div>
      <label className="mt-2.5 block text-xs font-medium text-[#71808b]">商户/摘要<input value={row.merchantName} onChange={(event) => onChange({ merchantName: event.target.value })} disabled={row.duplicate} className="mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-sm text-[#303b44] outline-none" /></label>
      <label className="mt-2.5 block text-xs font-medium text-[#71808b]">商品说明<input value={row.productName} onChange={(event) => onChange({ productName: event.target.value })} disabled={row.duplicate} placeholder="账单中的商品或交易描述" className="mt-1 w-full rounded-xl bg-[#f3f6f6] px-2.5 py-2.5 text-sm text-[#303b44] outline-none" /></label>
      {onSaveRule && !row.duplicate && row.categoryId && row.direction !== "unknown" && <button type="button" disabled={savingRule || ruleSaved} onClick={() => { setSavingRule(true); void onSaveRule().then(() => setRuleSaved(true)).finally(() => setSavingRule(false)); }} className="mt-2.5 w-full rounded-xl border border-[#bce5df] bg-[#f3fbfa] py-2 text-sm font-medium text-[#0c6f78] disabled:opacity-60">{ruleSaved ? "已记住此商户分类" : savingRule ? "正在保存规则…" : "记住此商户分类"}</button>}
      {!row.duplicate && row.enabled && invalid && <p className="mt-2 text-xs text-[#b47b19]">请确认收支类型并选择分类后再导入。</p>}
    </div>}

    {pickerOpen && row.direction !== "unknown" && <CategoryPickerSheet kind={row.direction} categories={categories} selectedCategoryId={row.categoryId ?? ""} activeParentId={activeParentId} setActiveParentId={setActiveParentId} onClose={() => setPickerOpen(false)} onSelect={(category) => { onChange({ categoryId: category.id, categorySuggestion: null }); setPickerOpen(false); setActiveParentId(null); }} onAddCategory={() => onCategoryAdmin?.("new", row, row.direction === "expense" ? activeParentId : null)} onManageCategories={() => onCategoryAdmin?.("manage", row, row.direction === "expense" ? activeParentId : null)} />}
  </section>;
}

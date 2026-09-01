"use client";

import { useState } from "react";
import type { LedgerCategory } from "@/features/ledger/use-ledger";

export type ImportPreviewRow = {
  clientKey: string;
  rowNumber: number;
  occurredAt: string;
  merchantName: string;
  amountCents: number;
  direction: "expense" | "income" | "unknown";
  categoryId: string | null;
  accountId: string | null;
  note: string;
  externalTransactionId: string | null;
  enabled: boolean;
  duplicate: boolean;
  error: string | null;
  categorySuggestion?: "platform" | "keyword" | null;
};

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace(" ", "T").slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ImportPreviewEditor({ row, categories, accounts, onChange }: { row: ImportPreviewRow; categories: LedgerCategory[]; accounts: { id: string; name: string; color: string }[]; onChange: (patch: Partial<ImportPreviewRow>) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const invalid = row.direction === "unknown" || !row.categoryId || !row.occurredAt || row.amountCents <= 0;
  const selectedCategory = categories.find((category) => category.id === row.categoryId);
  return <section className={`rounded-2xl border p-4 shadow-sm ${row.duplicate ? "border-[#efd5c9] bg-[#fff9f6]" : invalid && row.enabled ? "border-[#f1d38b] bg-[#fffdf5]" : "border-[#e8eeee] bg-white"}`}>
    <div className="flex items-center gap-3"><label className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef5f4]"><input type="checkbox" checked={row.enabled} disabled={row.duplicate} onChange={(event) => onChange({ enabled: event.target.checked })} className="size-5 accent-[#0c6f78]" /><span className="sr-only">导入该笔流水</span></label><div className="min-w-0 flex-1"><p className="truncate text-base font-bold">{row.merchantName || "未识别商户"}</p><p className="mt-0.5 text-xs text-[#8b94a3]">第 {row.rowNumber} 行{row.externalTransactionId ? " · 有平台订单号" : " · 将使用账单指纹去重"}</p></div><b className="money text-lg">¥{(row.amountCents / 100).toFixed(2)}</b>{row.duplicate && <span className="rounded-full bg-[#fff0eb] px-2 py-1 text-xs font-bold text-[#d55a3e]">重复</span>}</div>
    <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-medium text-[#71808b]">时间<input value={localDateTime(row.occurredAt)} onChange={(event) => onChange({ occurredAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} type="datetime-local" disabled={row.duplicate} className="mt-1.5 w-full rounded-xl bg-[#f3f6f6] px-3 py-3 text-sm text-[#303b44] outline-none" /></label><label className="text-sm font-medium text-[#71808b]">金额<input value={(row.amountCents / 100).toFixed(2)} onChange={(event) => { const cents = Math.round(Number(event.target.value || 0) * 100); onChange({ amountCents: Number.isFinite(cents) ? cents : 0 }); }} inputMode="decimal" disabled={row.duplicate} className="money mt-1.5 w-full rounded-xl bg-[#f3f6f6] px-3 py-3 text-lg font-bold text-[#303b44] outline-none" /></label></div>
    <div className="mt-4 grid grid-cols-3 rounded-xl bg-[#edf2f2] p-1"><button type="button" disabled={row.duplicate} onClick={() => onChange({ direction: "expense", categoryId: row.direction === "expense" ? row.categoryId : null, error: null })} className={`rounded-lg py-2.5 text-sm font-bold ${row.direction === "expense" ? "bg-white text-[#0c6f78] shadow-sm" : "text-[#86919a]"}`}>支出</button><button type="button" disabled={row.duplicate} onClick={() => onChange({ direction: "income", categoryId: row.direction === "income" ? row.categoryId : null, error: null })} className={`rounded-lg py-2.5 text-sm font-bold ${row.direction === "income" ? "bg-white text-[#ff714b] shadow-sm" : "text-[#86919a]"}`}>收入</button><button type="button" disabled={row.duplicate} onClick={() => onChange({ direction: "unknown", categoryId: null })} className={`rounded-lg py-2.5 text-sm font-bold ${row.direction === "unknown" ? "bg-white text-[#9a7a24] shadow-sm" : "text-[#86919a]"}`}>待确认</button></div>
    <button type="button" onClick={() => setPickerOpen(true)} disabled={row.duplicate || row.direction === "unknown"} className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left ${selectedCategory ? "border-[#bce5df] bg-[#effaf8]" : "border-[#e2e8e8] bg-[#f8fbfb]"}`}><span><small className="block text-xs text-[#84909a]">分类{row.categorySuggestion && selectedCategory ? " · 自动推荐" : ""}</small><b className={`mt-1 block ${selectedCategory ? "text-[#0c6f78]" : "text-[#76818b]"}`}>{selectedCategory?.name ?? "点击选择分类"}</b></span><span className="grid size-9 place-items-center rounded-full bg-white text-lg text-[#58716f]">›</span></button>
    <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-medium text-[#71808b]">账户<select value={row.accountId ?? ""} onChange={(event) => onChange({ accountId: event.target.value || null })} disabled={row.duplicate} className="mt-1.5 w-full rounded-xl bg-[#f3f6f6] px-3 py-3 text-[#303b44] outline-none"><option value="">不指定</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="text-sm font-medium text-[#71808b]">备注<input value={row.note} onChange={(event) => onChange({ note: event.target.value })} disabled={row.duplicate} placeholder="可选" className="mt-1.5 w-full rounded-xl bg-[#f3f6f6] px-3 py-3 text-[#303b44] outline-none" /></label></div>
    <label className="mt-3 block text-sm font-medium text-[#71808b]">商户/摘要<input value={row.merchantName} onChange={(event) => onChange({ merchantName: event.target.value })} disabled={row.duplicate} className="mt-1.5 w-full rounded-xl bg-[#f3f6f6] px-3 py-3 text-[#303b44] outline-none" /></label>
    {!row.duplicate && row.enabled && invalid && <p className="mt-3 text-xs text-[#b47b19]">请确认收支类型并选择分类后再导入。</p>}
    {pickerOpen && <ImportCategoryPicker direction={row.direction} categories={categories} selectedCategoryId={row.categoryId} onClose={() => setPickerOpen(false)} onSelect={(categoryId) => { onChange({ categoryId, categorySuggestion: null }); setPickerOpen(false); }} />}
  </section>;
}

function ImportCategoryPicker({ direction, categories, selectedCategoryId, onClose, onSelect }: { direction: ImportPreviewRow["direction"]; categories: LedgerCategory[]; selectedCategoryId: string | null; onClose: () => void; onSelect: (categoryId: string) => void }) {
  const [parentId, setParentId] = useState<string | null>(null);
  const roots = categories.filter((category) => category.kind === "expense" && !category.parentId);
  const selectable = direction === "income" ? categories.filter((category) => category.kind === "income" && !category.parentId) : parentId ? categories.filter((category) => category.kind === "expense" && category.parentId === parentId) : roots;
  const parent = roots.find((category) => category.id === parentId);
  return <div className="fixed inset-0 z-[60] flex items-end bg-black/40 md:items-center md:justify-center"><section className="max-h-[82dvh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-w-[560px] md:rounded-[28px]"><header className="flex items-center justify-between border-b border-[#edf0f0] px-5 py-4"><button onClick={() => parentId ? setParentId(null) : onClose()} className="grid size-10 place-items-center rounded-full bg-[#f2f5f5] text-lg">‹</button><div className="text-center"><p className="font-bold">选择{direction === "income" ? "收入" : "支出"}分类</p><p className="mt-0.5 text-xs text-[#8b94a3]">{parent ? parent.name : direction === "expense" ? "先选大类，再选小类" : "选择对应分类"}</p></div><button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-[#f2f5f5] text-lg">×</button></header><div className="max-h-[60dvh] overflow-y-auto p-4">{direction === "expense" && !parentId && <div className="mb-4 rounded-xl bg-[#eaf8f6] px-4 py-3 text-sm text-[#47716f]">请先选择一个支出大类</div>}<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{selectable.map((category) => { const isParent = direction === "expense" && !parentId; const selected = category.id === selectedCategoryId; return <button type="button" key={category.id} onClick={() => isParent ? setParentId(category.id) : onSelect(category.id)} className={`grid min-h-24 place-items-center gap-2 rounded-2xl border px-2 py-3 text-center text-sm font-medium ${selected ? "border-[#28c5b4] bg-[#e4f7f4] text-[#0c6f78]" : "border-[#e8eeee] bg-white text-[#4d5863]"}`}><span className={`grid size-10 place-items-center rounded-full ${direction === "income" ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]"}`}>{category.name.slice(0, 1)}</span><span className="max-w-full truncate">{category.name}</span>{isParent && <small className="text-xs text-[#98a1aa]">选择小类</small>}</button>; })}</div>{!selectable.length && <p className="py-10 text-center text-sm text-[#8b94a3]">暂无可选分类</p>}</div></section></div>;
}

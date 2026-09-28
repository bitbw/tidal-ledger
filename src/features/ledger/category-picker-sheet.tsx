"use client";

import {
  ArrowLeftRight,
  BadgePlus,
  Bike,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Heart,
  Home,
  Landmark,
  Plane,
  Shirt,
  ShoppingBag,
  TrendingUp,
  Utensils,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { LedgerCategory } from "@/features/ledger/use-ledger";

export function categoryIcon(icon?: string | null) {
  switch (icon) {
    case "coffee": return Coffee;
    case "car": return ArrowLeftRight;
    case "bike": return Bike;
    case "plane": return Plane;
    case "shopping-bag": return ShoppingBag;
    case "shirt": return Shirt;
    case "home": return Home;
    case "heart": return Heart;
    case "wallet": return WalletCards;
    case "badge-plus": return BadgePlus;
    case "zap": return Zap;
    case "landmark": return Landmark;
    case "trending-up": return TrendingUp;
    default: return Utensils;
  }
}

export function CategoryPickerSheet({
  kind,
  categories,
  selectedCategoryId,
  activeParentId,
  setActiveParentId,
  onClose,
  onSelect,
  onAddCategory,
  onManageCategories,
}: {
  kind: "expense" | "income";
  categories: LedgerCategory[];
  selectedCategoryId: string;
  activeParentId: string | null;
  setActiveParentId: (id: string | null) => void;
  onClose: () => void;
  onSelect: (category: LedgerCategory) => void;
  onAddCategory?: () => void;
  onManageCategories?: () => void;
}) {
  const roots = categories.filter((category) => category.kind === "expense" && !category.parentId);
  const items = kind === "income"
    ? categories.filter((category) => category.kind === "income" && !category.parentId)
    : activeParentId
      ? categories.filter((category) => category.kind === "expense" && category.parentId === activeParentId)
      : roots;
  const activeParent = roots.find((category) => category.id === activeParentId);
  const isIncome = kind === "income";
  const iconStyle = isIncome ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]";
  const selectedTextStyle = isIncome ? "text-[#ff714b]" : "text-[#0c6f78]";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 md:items-center md:justify-center">
      <section role="dialog" aria-modal="true" aria-label={`选择${isIncome ? "收入" : "支出"}分类`} className="max-h-[82dvh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-w-[560px] md:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-[#edf0f0] px-5 py-4">
          <button type="button" onClick={() => activeParentId ? setActiveParentId(null) : onClose()} aria-label={activeParentId ? "返回分类大类" : "关闭分类选择"} className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-bold">选择分类</p>
            {activeParent && <p className="text-xs text-[#8b94a3]">{activeParent.name}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]">
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[54dvh] overflow-y-auto px-5 py-3">
          {items.map((category) => {
            const Icon = categoryIcon(category.icon);
            const isParent = kind === "expense" && !activeParentId;
            return (
              <button
                type="button"
                key={category.id}
                onClick={() => isParent ? setActiveParentId(category.id) : onSelect(category)}
                className="flex w-full items-center gap-3 border-b border-[#f0f2f2] py-4 text-left last:border-0"
              >
                <span className={`grid size-10 place-items-center rounded-2xl ${iconStyle}`}>
                  <Icon size={20} />
                </span>
                <span className="flex-1 font-medium">{category.name}</span>
                {isParent ? <ChevronRight size={18} className="text-[#a5adb6]" /> : category.id === selectedCategoryId ? <span className={`text-sm font-bold ${selectedTextStyle}`}>已选</span> : null}
              </button>
            );
          })}
          {!items.length && <p className="py-10 text-center text-sm text-[#8b94a3]">{kind === "expense" ? "当前大类还没有小类。" : "暂无可选分类。"}</p>}
        </div>
        {(onAddCategory || onManageCategories) && (
          <footer className="flex border-t border-[#edf0f0] text-[#ff714b]">
            {onAddCategory && <button type="button" onClick={onAddCategory} className="flex-1 py-4 text-sm font-bold">+ 新增分类</button>}
            {onManageCategories && <button type="button" onClick={onManageCategories} className={`flex-1 py-4 text-sm font-bold ${onAddCategory ? "border-l border-[#edf0f0]" : ""}`}>管理</button>}
          </footer>
        )}
      </section>
    </div>
  );
}

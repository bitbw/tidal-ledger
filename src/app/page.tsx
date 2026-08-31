"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bike,
  BadgePlus,
  BarChart3,
  BellRing,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  Ellipsis,
  FileUp,
  Home,
  Heart,
  Landmark,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  Plane,
  Plus,
  ReceiptText,
  Settings2,
  Shirt,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  parseStatementFile,
  type ParsedStatement,
} from "@/features/importers/parse-statement";
import {
  useLedger,
  type LedgerCategory,
  type LedgerTransaction,
} from "@/features/ledger/use-ledger";
import { ReportsView as LedgerReportsView } from "@/features/ledger/reports-view";
import { useRecurringEntries, type RecurringEntry, type RecurringInput } from "@/features/ledger/use-recurring-entries";
import { useSession } from "@/lib/auth/client";

type View = "home" | "reports" | "accounts" | "plans" | "transactions";
type TransactionKind = "expense" | "income";

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "accounts", label: "账户", icon: WalletCards },
  { id: "plans", label: "计划", icon: Target },
  { id: "home", label: "首页", icon: Home },
  { id: "reports", label: "报表", icon: BarChart3 },
];

function categoryIcon(icon?: string | null) {
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

function yuan(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function MiniTrend({
  color = "#28c5b4",
  income = false,
}: {
  color?: string;
  income?: boolean;
}) {
  const path = income
    ? "M0 140 L16 151 L40 153 L80 153 L124 153 L135 22 L144 153 L210 153 L245 153 L265 151 L294 153"
    : "M0 50 L9 128 L18 142 L36 146 L54 151 L70 148 L86 152 L100 147 L114 152 L128 147 L135 10 L142 150 L170 151 L202 152 L240 153 L294 153";
  return (
    <svg
      viewBox="0 0 294 170"
      className="h-44 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-label="月度趋势图"
    >
      {[28, 70, 112, 154].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="294"
          y2={y}
          stroke="#e6ecec"
          strokeDasharray="3 5"
        />
      ))}
      <line
        x1="0"
        y1="144"
        x2="294"
        y2="144"
        stroke={color}
        strokeDasharray="4 6"
        opacity=".38"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.8"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={income ? "135" : "135"}
        cy={income ? "22" : "10"}
        r="4.5"
        fill="white"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      <text x="0" y="168" fill="#a4adb7" fontSize="10">
        1日
      </text>
      <text x="62" y="168" fill="#a4adb7" fontSize="10">
        6日
      </text>
      <text x="118" y="168" fill="#a4adb7" fontSize="10">
        11日
      </text>
      <text x="174" y="168" fill="#a4adb7" fontSize="10">
        16日
      </text>
      <text x="272" y="168" fill="#a4adb7" fontSize="10">
        31日
      </text>
    </svg>
  );
}

function Logo() {
  return (
    <div className="grid size-9 place-items-center rounded-2xl bg-[#e1f7f4] text-[#0c6f78]">
      <span className="text-lg font-black">潮</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6f6]">
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-[22px] bg-[#0c6f78] text-2xl font-black text-white shadow-lg">
          潮
        </div>
        <p className="mt-4 text-sm font-medium text-[#65717d]">
          正在连接你的账本…
        </p>
      </div>
    </main>
  );
}

function LoginScreen() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#eef5f4] p-5">
      <div className="ripple-grid absolute inset-0 bg-[#0c6f78] opacity-[.06]" />
      <section className="relative w-full max-w-md rounded-[30px] bg-white p-7 shadow-[0_24px_60px_rgba(12,111,120,.18)] sm:p-9">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="text-lg font-bold">潮汐账本</p>
            <p className="text-xs text-[#8b94a3]">从每一笔，看见你的生活</p>
          </div>
        </div>
        <div className="mt-10">
          <p className="text-2xl font-bold tracking-tight">登录你的云端账本</p>
          <p className="mt-2 text-sm leading-6 text-[#78848d]">
            Neon 数据库与 Better Auth
            账号系统已就绪。首次注册后会自动建立你的日常账本。
          </p>
        </div>
        <button
          onClick={() => window.location.assign("/sign-in")}
          className="mt-7 w-full rounded-xl bg-[#0c6f78] py-3.5 text-sm font-bold text-white transition hover:bg-[#085d65]"
        >
          登录
        </button>
        <button
          onClick={() => window.location.assign("/sign-up")}
          className="mt-3 w-full rounded-xl border border-[#cfe2e1] bg-white py-3.5 text-sm font-bold text-[#0c6f78]"
        >
          创建账号
        </button>
      </section>
    </main>
  );
}

export default function HomePage() {
  const { data: session, isPending: authLoading } = useSession();
  const [view, setView] = useState<View>("home");
  const [composerOpen, setComposerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"choose" | "preview" | "done">(
    "choose",
  );
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDateTimeLocal(new Date().toISOString()));
  const [editingTransaction, setEditingTransaction] =
    useState<LedgerTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [transactionDateFilter, setTransactionDateFilter] = useState<
    string | null
  >(null);
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const ledger = useLedger(Boolean(session?.user));
  const recurring = useRecurringEntries(Boolean(session?.user));

  const selectableCategories = useMemo(
    () =>
      ledger.categories.filter(
        (category) =>
          category.kind === kind &&
          (kind === "income" ? !category.parentId : Boolean(category.parentId)),
      ),
    [kind, ledger.categories],
  );
  const commonCategories = useMemo(() => {
    const usage = new Map<string, { count: number; lastUsed: number }>();
    ledger.transactions.forEach((transaction) => {
      if (!transaction.categoryId) return;
      const current = usage.get(transaction.categoryId) ?? { count: 0, lastUsed: 0 };
      usage.set(transaction.categoryId, {
        count: current.count + 1,
        lastUsed: Math.max(current.lastUsed, new Date(transaction.occurredAt).getTime()),
      });
    });
    return [...selectableCategories]
      .sort((left, right) => {
        const leftUsage = usage.get(left.id) ?? { count: 0, lastUsed: 0 };
        const rightUsage = usage.get(right.id) ?? { count: 0, lastUsed: 0 };
        return rightUsage.count - leftUsage.count || rightUsage.lastUsed - leftUsage.lastUsed || left.sortOrder - right.sortOrder;
      })
      .slice(0, 7);
  }, [ledger.transactions, selectableCategories]);
  const selectedCategory = ledger.categories.find((category) => category.id === selectedCategoryId);
  const kindLabel = kind === "expense" ? "支出" : "收入";
  const SelectedIcon = categoryIcon(selectedCategory?.icon);
  const defaultCategoryId = (targetKind: TransactionKind) =>
    ledger.categories.find(
      (category) =>
        category.kind === targetKind &&
        (targetKind === "income" ? !category.parentId : Boolean(category.parentId)),
    )?.id ?? "";

  function switchKind(targetKind: TransactionKind) {
    setKind(targetKind);
    setSelectedCategoryId(defaultCategoryId(targetKind));
  }

  const headline = useMemo(() => {
    if (view === "transactions") return "全部流水";
    if (view === "reports") return "报表";
    if (view === "accounts") return "账户";
    if (view === "plans") return "计划";
    return "首页";
  }, [view]);

  function inputNumber(value: string) {
    setAmount((current) => {
      if (value === "clear") return "0";
      if (value === "⌫") {
        const next = current.length <= 1 ? "0" : current.slice(0, -1);
        return next === "" || next === "-" ? "0" : next;
      }
      if (value === ".") return current.includes(".") ? current : `${current}.`;
      if (!/^\d$/.test(value)) return current;
      const integerPart = current.split(".")[0].replace(/^0+(?=\d)/, "") || "0";
      const decimalPart = current.includes(".")
        ? current.split(".")[1]
        : undefined;
      if (decimalPart !== undefined && decimalPart.length >= 2) return current;
      if (decimalPart !== undefined)
        return `${integerPart}.${decimalPart}${value}`;
      if (integerPart.length >= 9) return current;
      return integerPart === "0" ? value : `${integerPart}${value}`;
    });
  }

  function setAmountFromKeyboard(value: string) {
    if (!/^\d*(?:\.\d{0,2})?$/.test(value) || value.length > 12) return;
    setAmount(value || "0");
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    switchKind("expense");
    setAmount("0");
    setNote("");
    setOccurredAt(toDateTimeLocal(new Date().toISOString()));
    setComposerOpen(true);
  }

  function openTransactionEditor(transaction: LedgerTransaction) {
    if (transaction.transactionType === "transfer") {
      setToast("转账编辑将在账户模块上线后支持。");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }
    const transactionKind: TransactionKind = transaction.transactionType === "income" ? "income" : "expense";
    setEditingTransaction(transaction);
    setKind(transactionKind);
    setSelectedCategoryId(transaction.categoryId ?? defaultCategoryId(transactionKind));
    setAmount((transaction.amountCents / 100).toFixed(2));
    setNote(transaction.note || "");
    setOccurredAt(toDateTimeLocal(transaction.occurredAt));
    setComposerOpen(true);
  }

  async function saveTransaction() {
    if (saving) return;
    const amountCents = Math.round(Number.parseFloat(amount || "0") * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setToast("请输入大于 0 的金额");
      return;
    }
    if (!selectedCategoryId) {
      setToast("请选择分类");
      return;
    }
    try {
      setSaving(true);
      if (editingTransaction) {
        await ledger.updateTransaction({
          id: editingTransaction.id,
          transactionType: kind,
          amountCents,
          categoryId: selectedCategoryId,
          note,
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        });
      } else {
        await ledger.addTransaction({
          transactionType: kind,
          amountCents,
          categoryId: selectedCategoryId,
          note,
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        });
      }
      setComposerOpen(false);
      setAmount("0");
      setNote("");
      setOccurredAt(toDateTimeLocal(new Date().toISOString()));
      setEditingTransaction(null);
      setToast(
        editingTransaction ? "流水已更新" : `${kindLabel}已保存到云端账本`,
      );
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
    window.setTimeout(() => setToast(""), 3200);
  }

  if (authLoading) return <LoadingScreen />;
  if (!session?.user) return <LoginScreen />;

  return (
    <main className="min-h-screen bg-[var(--canvas)] pb-24 md:pb-0">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[232px] flex-col border-r border-[#e6eded] bg-white px-4 py-5 md:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <Logo />
          <div>
            <p className="font-semibold tracking-tight">潮汐账本</p>
            <p className="text-xs text-[#8b94a3]">你的资金流向</p>
          </div>
        </div>
        <button className="mb-6 flex items-center justify-between rounded-2xl bg-[#f2f7f7] px-3 py-3 text-sm font-medium">
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-[#0c6f78] text-white">
              日
            </span>
            日常账本
          </span>
          <ChevronDown size={15} />
        </button>
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${view === id ? "bg-[#e8f6f4] font-semibold text-[#0c6f78]" : "text-[#68727e] hover:bg-[#f5f8f8]"}`}
            >
              <Icon size={19} strokeWidth={view === id ? 2.4 : 1.8} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#0c6f78] p-4 text-white">
          <Sparkles size={18} className="mb-4 text-[#83eee0]" />
          <p className="text-sm font-semibold">账单导入</p>
          <p className="mt-1 text-xs leading-5 text-[#c4efea]">
            微信、支付宝账单一键整理，重复账目自动跳过。
          </p>
          <button
            onClick={() => {
              setImportOpen(true);
              setImportStep("choose");
            }}
            className="mt-4 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0c6f78]"
          >
            导入账单
          </button>
        </div>
      </aside>

      <section className="mx-auto max-w-[1440px] px-4 pt-4 md:ml-[232px] md:px-8 md:py-7">
        <header className="mb-5 flex items-center justify-between md:mb-7">
          <div className="flex items-center gap-3 md:hidden">
            <Logo />
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="font-semibold"
            >
              日常账本 <ChevronDown className="inline" size={15} />
            </button>
          </div>
          <h1 className="hidden text-xl font-semibold md:block">{headline}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setImportOpen(true);
                setImportStep("choose");
              }}
              className="hidden items-center gap-2 rounded-xl border border-[#dce7e6] bg-white px-3 py-2 text-sm font-medium text-[#365158] hover:bg-[#f6fbfa] sm:flex"
            >
              <FileUp size={16} />
              导入账单
            </button>
            <button className="grid size-10 place-items-center rounded-xl bg-white text-[#50616a] shadow-sm">
              <BellRing size={18} />
            </button>
            <button className="grid size-10 place-items-center rounded-xl bg-[#e5f1f0] text-sm font-bold text-[#0c6f78]">
              B
            </button>
          </div>
        </header>
        {mobileMenu && (
          <div className="mb-3 grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow-lg md:hidden">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                onClick={() => {
                  setView(id);
                  setMobileMenu(false);
                }}
                className={`grid place-items-center gap-1 rounded-xl p-2 text-xs ${view === id ? "bg-[#e8f6f4] text-[#0c6f78]" : "text-[#6b7580]"}`}
                key={id}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        )}

        {ledger.error && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a94a2e]">
            <span>云端账本尚未就绪：{ledger.error}</span>
            <button onClick={() => void ledger.refresh()} className="font-bold">
              重试
            </button>
          </div>
        )}
        {view === "home" && (
          <HomeView
            onCompose={openNewTransaction}
            onEdit={openTransactionEditor}
            onSelectDay={(date) => {
              setTransactionDateFilter(date);
              setView("transactions");
            }}
            onViewAll={() => {
              setTransactionDateFilter(null);
              setView("transactions");
            }}
            onImport={() => {
              setImportOpen(true);
              setImportStep("choose");
            }}
            onOpenRecurring={() => setView("plans")}
            totals={ledger.totals}
            transactionCount={ledger.transactions.length}
            transactions={ledger.transactions}
          />
        )}
        {view === "reports" && (
          <LedgerReportsView
            enabled={Boolean(session?.user)}
            onEdit={openTransactionEditor}
          />
        )}
        {view === "transactions" && (
          <TransactionsView
            transactions={ledger.transactions}
            selectedDate={transactionDateFilter}
            onClearDate={() => setTransactionDateFilter(null)}
            onEdit={openTransactionEditor}
            onBack={() => {
              setTransactionDateFilter(null);
              setView("home");
            }}
          />
        )}
        {view === "accounts" && <AccountsView />}
        {view === "plans" && <PlansView recurring={recurring} categories={ledger.categories} accounts={ledger.accounts} />}
      </section>

      <button
        onClick={openNewTransaction}
        className="fixed bottom-[76px] left-1/2 z-20 grid size-[60px] -translate-x-1/2 place-items-center rounded-full bg-[#ff714b] text-white shadow-[0_12px_25px_rgba(255,113,75,.38)] transition hover:scale-105 md:bottom-8 md:left-auto md:right-10 md:translate-x-0"
      >
        <Plus size={31} strokeWidth={2.5} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-[68px] items-center justify-around border-t border-[#e7eeee] bg-white/95 px-3 backdrop-blur md:hidden">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            onClick={() => setView(id)}
            className={`grid min-w-12 place-items-center gap-1 text-[11px] ${view === id ? "font-bold text-[#0c6f78]" : "text-[#7d8792]"}`}
            key={id}
          >
            <Icon size={20} strokeWidth={view === id ? 2.4 : 1.9} />
            {label}
          </button>
        ))}
      </nav>

      {composerOpen && (
        <Composer
          kind={kind}
          setKind={switchKind}
          selectedCategory={selectedCategory}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          categories={commonCategories}
          allCategories={ledger.categories}
          pickerOpen={categoryPickerOpen}
          setPickerOpen={setCategoryPickerOpen}
          createCategory={ledger.createCategory}
          updateCategory={ledger.updateCategory}
          archiveCategory={ledger.archiveCategory}
          amount={amount}
          note={note}
          occurredAt={occurredAt}
          setOccurredAt={setOccurredAt}
          editing={Boolean(editingTransaction)}
          saving={saving}
          inputNumber={inputNumber}
          onAmountChange={setAmountFromKeyboard}
          setNote={setNote}
          onClose={() => !saving && setComposerOpen(false)}
          onSave={saveTransaction}
          SelectedIcon={SelectedIcon}
        />
      )}
      {importOpen && (
        <ImportDialog
          step={importStep}
          setStep={setImportStep}
          onClose={() => setImportOpen(false)}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#20252b] px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function HomeView({
  onCompose,
  onEdit,
  onImport,
  onSelectDay,
  onViewAll,
  totals,
  transactionCount,
  transactions,
  onOpenRecurring,
}: {
  onCompose: () => void;
  onEdit: (transaction: LedgerTransaction) => void;
  onImport: () => void;
  onSelectDay: (date: string) => void;
  onViewAll: () => void;
  totals: { income: number; expense: number; balance: number };
  transactionCount: number;
  transactions: LedgerTransaction[];
  onOpenRecurring: () => void;
}) {
  const displayRecent = transactions.slice(0, 3).map((item) => ({
    transaction: item,
    icon: item.transactionType === "income" ? WalletCards : Utensils,
    color: item.transactionType === "income" ? "#ff714b" : "#28c5b4",
    title: item.merchantName || item.note || "未命名流水",
    meta: new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(item.occurredAt)),
    amount:
      item.transactionType === "income"
        ? item.amountCents / 100
        : -(item.amountCents / 100),
  }));
  return (
    <div className="space-y-5 md:space-y-7">
      <section className="ripple-grid relative overflow-hidden rounded-[28px] bg-[#0c6f78] px-6 py-6 text-white shadow-[0_14px_34px_rgba(12,111,120,.23)] md:px-8 md:py-8">
        <div className="absolute -right-10 -top-20 size-64 rounded-full border-[28px] border-white/[.07]" />
        <div className="absolute right-36 top-7 size-24 rounded-full border border-white/[.13]" />
        <div className="relative flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <p className="mb-3 text-sm text-[#c6eeea]">本月支出 · 云端账本</p>
            <p className="money text-[42px] font-bold leading-none md:text-[54px]">
              {yuan(totals.expense)}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                本月收入{" "}
                <b className="money ml-1 text-white">{yuan(totals.income)}</b>
              </span>
              <span className="hidden text-white/35 sm:inline">|</span>
              <span>
                本月结余{" "}
                <b className="money ml-1 text-white">{yuan(totals.balance)}</b>
              </span>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={onCompose}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#0c6f78] shadow-lg transition hover:-translate-y-0.5"
            >
              <Plus size={18} />
              记一笔
            </button>
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.16fr_.84fr]">
        <div className="card soft-shadow p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-base font-bold">八月预算</p>
              <p className="mt-1 text-sm text-[#8b94a3]">
                预算模块将在下一步接入真实云端配置
              </p>
            </div>
            <p className="text-right text-sm text-[#66717d]">
              已记录
              <br />
              <b className="money text-2xl text-[#20252b]">
                {transactionCount}
              </b>{" "}
              笔
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#edf2f2]">
            <div className="h-full w-[35%] rounded-full bg-[#28c5b4]" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-[#8b94a3]">
            <span>真实流水已连接</span>
            <span>下一步：预算</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-bold">最近流水</p>
              <p className="mt-1 text-sm text-[#8b94a3]">
                每一笔都在形成你的消费地图
              </p>
            </div>
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-[#0c6f78]"
            >
              查看全部
            </button>
          </div>
          <div className="space-y-4">
            {displayRecent.length ? (
              displayRecent.map(
                ({ transaction, icon: Icon, color, title, meta, amount }) => (
                  <button
                    onClick={() => onEdit(transaction)}
                    className="flex w-full items-center gap-3 text-left"
                    key={`${title}-${meta}`}
                  >
                    <div
                      className="grid size-10 place-items-center rounded-2xl"
                      style={{ background: `${color}1f`, color }}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{title}</p>
                      <p className="truncate text-xs text-[#8b94a3]">{meta}</p>
                    </div>
                    <b
                      className={`money ${amount > 0 ? "text-[#ff714b]" : "text-[#20252b]"}`}
                    >
                      {amount > 0 ? "+" : "-"}¥{yuan(Math.abs(amount))}
                    </b>
                  </button>
                ),
              )
            ) : (
              <p className="rounded-xl bg-[#f5f7f7] px-4 py-6 text-center text-sm text-[#8b94a3]">
                还没有流水，先记一笔吧。
              </p>
            )}
          </div>
        </div>
      </section>
      <CalendarCard transactions={transactions} onSelectDay={onSelectDay} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction icon={CalendarDays} label="账单日历" color="#f49a5d" />
        <QuickAction icon={Clock3} label="周期账" color="#8366e8" onClick={onOpenRecurring} />
        <QuickAction
          icon={FileUp}
          label="导入账单"
          color="#0c6f78"
          onClick={onImport}
        />
        <QuickAction icon={LayoutGrid} label="更多工具" color="#5579de" />
      </section>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: typeof CalendarDays;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card flex flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="grid size-9 place-items-center rounded-xl"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={19} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function CalendarCard({
  transactions,
  onSelectDay,
}: {
  transactions: LedgerTransaction[];
  onSelectDay: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  return (
    <section className="card soft-shadow p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold">{monthTitle(month)}</p>
          <p className="mt-1 text-sm text-[#8b94a3]">
            每天的收入和支出，构成你的资金潮汐
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            className="grid size-9 place-items-center rounded-xl bg-[#f3f7f7] text-[#587078]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            className="grid size-9 place-items-center rounded-xl bg-[#f3f7f7] text-[#587078]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <CalendarGrid
        month={month}
        transactions={transactions}
        onSelectDay={onSelectDay}
      />
    </section>
  );
}

function compactAmount(amount: number) {
  return amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0);
}

function CalendarGrid({
  month,
  transactions,
  onSelectDay,
}: {
  month: Date;
  transactions: LedgerTransaction[];
  onSelectDay: (date: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daily = new Map<number, { expense: number; income: number }>();
  for (const transaction of transactions) {
    const occurredAt = new Date(transaction.occurredAt);
    if (
      occurredAt.getFullYear() !== year ||
      occurredAt.getMonth() !== monthIndex
    )
      continue;
    const entry = daily.get(occurredAt.getDate()) ?? { expense: 0, income: 0 };
    if (transaction.transactionType === "expense")
      entry.expense += transaction.amountCents / 100;
    if (transaction.transactionType === "income")
      entry.income += transaction.amountCents / 100;
    daily.set(occurredAt.getDate(), entry);
  }
  const today = new Date();
  const cells = Array.from(
    { length: Math.ceil((startOffset + dayCount) / 7) * 7 },
    (_, index) => index - startOffset + 1,
  );
  return (
    <div>
      <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-[#98a1aa]">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-3">
        {cells.map((date) => {
          const visible = date >= 1 && date <= dayCount;
          const day = visible ? daily.get(date) : undefined;
          const isToday =
            visible &&
            today.getFullYear() === year &&
            today.getMonth() === monthIndex &&
            today.getDate() === date;
          return (
            <button
              disabled={!day || (day.expense === 0 && day.income === 0)}
              onClick={() =>
                onSelectDay(localDateKey(new Date(year, monthIndex, date)))
              }
              className={`min-h-12 w-full px-1 text-center ${day && (day.expense > 0 || day.income > 0) ? "cursor-pointer rounded-xl transition hover:bg-[#f1f8f7]" : "cursor-default"}`}
              key={date}
            >
              <span
                className={`${visible ? "" : "text-[#c5cdd1]"} inline-grid size-7 place-items-center rounded-full text-sm ${isToday ? "bg-[#e4f7f4] font-bold text-[#0c6f78]" : ""}`}
              >
                {visible ? date : ""}
              </span>
              {day && day.expense > 0 && (
                <p className="money mt-1 text-[10px] text-[#28b9aa]">
                  {compactAmount(day.expense)}
                </p>
              )}
              {day && day.income > 0 && (
                <p className="money text-[10px] text-[#ff8b6d]">
                  +{compactAmount(day.income)}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsView({
  transactions,
  selectedDate,
  onClearDate,
  onEdit,
  onBack,
}: {
  transactions: LedgerTransaction[];
  selectedDate: string | null;
  onClearDate: () => void;
  onEdit: (transaction: LedgerTransaction) => void;
  onBack: () => void;
}) {
  const visibleTransactions = selectedDate
    ? transactions.filter(
        (transaction) =>
          localDateKey(new Date(transaction.occurredAt)) === selectedDate,
      )
    : transactions;
  const grouped = useMemo(() => {
    const groups = new Map<string, LedgerTransaction[]>();
    for (const transaction of [...visibleTransactions].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )) {
      const occurredAt = new Date(transaction.occurredAt);
      const key = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}-${String(occurredAt.getDate()).padStart(2, "0")}`;
      groups.set(key, [...(groups.get(key) ?? []), transaction]);
    }
    return Array.from(groups.entries());
  }, [visibleTransactions]);

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="grid size-10 place-items-center rounded-xl bg-white text-[#587078] shadow-sm"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h2 className="text-xl font-bold">
            {selectedDate ? "当天流水" : "全部流水"}
          </h2>
          <p className="text-sm text-[#8b94a3]">
            {selectedDate
              ? `${selectedDate} · ${visibleTransactions.length} 笔流水`
              : `已加载 ${transactions.length} 笔云端流水`}
          </p>
        </div>
        {selectedDate && (
          <button
            onClick={onClearDate}
            className="ml-auto rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#0c6f78] shadow-sm"
          >
            查看全部
          </button>
        )}
      </section>
      {grouped.length ? (
        grouped.map(([date, items]) => (
          <section className="card overflow-hidden" key={date}>
            <div className="border-b border-[#edf0f0] px-5 py-3 text-sm font-semibold text-[#53606b]">
              {new Intl.DateTimeFormat("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "short",
              }).format(new Date(`${date}T12:00:00`))}
            </div>
            <div className="divide-y divide-[#edf0f0]">
              {items.map((item) => {
                const isIncome = item.transactionType === "income";
                const Icon = isIncome
                  ? WalletCards
                  : item.transactionType === "transfer"
                    ? ArrowLeftRight
                    : Utensils;
                const color = isIncome
                  ? "#ff714b"
                  : item.transactionType === "transfer"
                    ? "#5579de"
                    : "#28c5b4";
                return (
                  <button
                    onClick={() => onEdit(item)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#f7fbfb]"
                    key={item.id}
                  >
                    <span
                      className="grid size-10 place-items-center rounded-2xl"
                      style={{ background: `${color}1a`, color }}
                    >
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {item.categoryName ||
                          item.merchantName ||
                          item.note ||
                          "未命名流水"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8b94a3]">
                        {new Intl.DateTimeFormat("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.occurredAt))}{" "}
                        ·{" "}
                        {item.transactionType === "income"
                          ? "收入"
                          : item.transactionType === "transfer"
                            ? "转账"
                            : "支出"}
                      </p>
                    </div>
                    <b
                      className={`money ml-3 shrink-0 text-right ${isIncome ? "text-[#ff714b]" : "text-[#20252b]"}`}
                    >
                      {isIncome ? "+" : "-"}¥{yuan(item.amountCents / 100)}
                    </b>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <section className="card p-10 text-center text-sm text-[#8b94a3]">
          还没有流水，先回首页记一笔吧。
        </section>
      )}
    </div>
  );
}

type ReportDay = {
  day: number;
  expense: number;
  income: number;
  expenseCount: number;
  incomeCount: number;
};

function monthTitle(month: Date) {
  return `${month.getFullYear()} / ${String(month.getMonth() + 1).padStart(2, "0")}`;
}

function ReportTrend({ color, values }: { color: string; values: number[] }) {
  const width = 300;
  const height = 166;
  const max = Math.max(...values, 1);
  const denominator = Math.max(values.length - 1, 1);
  const points = values
    .map((value, index) => {
      const x = (index / denominator) * width;
      const y = 140 - (value / max) * 112;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const peakIndex = values.reduce(
    (best, value, index) => (value > values[best] ? index : best),
    0,
  );
  const peakX = (peakIndex / denominator) * width;
  const peakY = 140 - (values[peakIndex] / max) * 112;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-44 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-label="真实流水月度趋势图"
    >
      {[28, 66, 104, 142].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2={width}
          y2={y}
          stroke="#e6ecec"
          strokeDasharray="3 5"
        />
      ))}
      {values.some(Boolean) ? (
        <>
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2.8"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={peakX}
            cy={peakY}
            r="4.5"
            fill="white"
            stroke={color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <text x="150" y="84" textAnchor="middle" fill="#98a1aa" fontSize="12">
          本月暂无对应流水
        </text>
      )}
      <text x="0" y="164" fill="#a4adb7" fontSize="10">
        1日
      </text>
      <text x="137" y="164" fill="#a4adb7" fontSize="10">
        月中
      </text>
      <text x="276" y="164" fill="#a4adb7" fontSize="10">
        月末
      </text>
    </svg>
  );
}

function ReportsView({ transactions }: { transactions: LedgerTransaction[] }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const report = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const monthIndex = selectedMonth.getMonth();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const daily: ReportDay[] = Array.from({ length: dayCount }, (_, index) => ({
      day: index + 1,
      expense: 0,
      income: 0,
      expenseCount: 0,
      incomeCount: 0,
    }));
    const categories = new Map<string, number>();

    for (const transaction of transactions) {
      const occurredAt = new Date(transaction.occurredAt);
      if (
        occurredAt.getFullYear() !== year ||
        occurredAt.getMonth() !== monthIndex
      )
        continue;
      const amount = transaction.amountCents / 100;
      const day = daily[occurredAt.getDate() - 1];
      if (transaction.transactionType === "expense") {
        day.expense += amount;
        day.expenseCount += 1;
        const category =
          transaction.categoryName || transaction.merchantName || "未分类";
        categories.set(category, (categories.get(category) ?? 0) + amount);
      }
      if (transaction.transactionType === "income") {
        day.income += amount;
        day.incomeCount += 1;
      }
    }

    const income = daily.reduce((sum, day) => sum + day.income, 0);
    const expense = daily.reduce((sum, day) => sum + day.expense, 0);
    return {
      daily,
      income,
      expense,
      balance: income - expense,
      incomeCount: daily.reduce((sum, day) => sum + day.incomeCount, 0),
      expenseCount: daily.reduce((sum, day) => sum + day.expenseCount, 0),
      categories: Array.from(categories, ([name, amount]) => ({
        name,
        amount,
      })).sort((a, b) => b.amount - a.amount),
    };
  }, [selectedMonth, transactions]);

  const moveMonth = (offset: number) =>
    setSelectedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  const expenseRows = report.daily
    .filter((day) => day.expense > 0)
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 3);
  const incomeRows = report.daily
    .filter((day) => day.income > 0)
    .sort((a, b) => b.income - a.income)
    .slice(0, 3);
  const totalCount = report.expenseCount + report.incomeCount;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-[#e8eeee] p-1 text-sm">
          <button className="rounded-lg bg-white px-5 py-2 font-semibold text-[#ff714b] shadow-sm">
            月
          </button>
        </div>
        <div className="flex items-center rounded-xl bg-white text-sm shadow-sm">
          <button
            onClick={() => moveMonth(-1)}
            className="grid size-10 place-items-center text-[#65717d] hover:bg-[#f4f7f7]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-24 text-center font-medium">
            {monthTitle(selectedMonth)}
          </span>
          <button
            onClick={() => moveMonth(1)}
            className="grid size-10 place-items-center text-[#65717d] hover:bg-[#f4f7f7]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="ml-auto text-sm text-[#8b94a3]">
          基于云端流水 · {totalCount} 笔
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label="本月收入" amount={report.income} color="#ff714b" />
        <ReportMetric
          label="本月支出"
          amount={report.expense}
          color="#28a99d"
        />
        <ReportMetric
          label="本月结余"
          amount={report.balance}
          color={report.balance >= 0 ? "#5579de" : "#d95d3d"}
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <LiveTrendCard
          title="支出趋势"
          color="#28c5b4"
          rows={expenseRows}
          values={report.daily.map((day) => day.expense)}
          transactionCount={report.expenseCount}
          transactionLabel="支出"
        />
        <LiveTrendCard
          title="收入趋势"
          color="#ff714b"
          rows={incomeRows}
          values={report.daily.map((day) => day.income)}
          transactionCount={report.incomeCount}
          transactionLabel="收入"
        />
      </section>
      <section className="card soft-shadow p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">分类支出</h2>
            <p className="mt-1 text-sm text-[#8b94a3]">
              按本月真实支出金额排序
            </p>
          </div>
          <ShoppingBag size={20} className="text-[#28a99d]" />
        </div>
        {report.categories.length ? (
          <div className="space-y-4">
            {report.categories.slice(0, 6).map((category) => (
              <div key={category.name}>
                <div className="mb-2 flex justify-between gap-4 text-sm">
                  <span className="truncate font-medium">{category.name}</span>
                  <span className="money shrink-0">
                    ¥{yuan(category.amount)} ·{" "}
                    {((category.amount / report.expense) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#edf2f2]">
                  <div
                    className="h-full rounded-full bg-[#28c5b4]"
                    style={{
                      width: `${Math.max((category.amount / report.expense) * 100, 2)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[#f5f7f7] px-4 py-8 text-center text-sm text-[#8b94a3]">
            本月尚无支出流水，记一笔后这里会自动更新。
          </p>
        )}
      </section>
    </div>
  );
}

function ReportMetric({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <section className="card p-5">
      <p className="text-sm text-[#7d8792]">{label}</p>
      <p className="money mt-2 text-2xl font-bold" style={{ color }}>
        ¥{yuan(amount)}
      </p>
    </section>
  );
}

function LiveTrendCard({
  title,
  color,
  values,
  rows,
  transactionCount,
  transactionLabel,
}: {
  title: string;
  color: string;
  values: number[];
  rows: ReportDay[];
  transactionCount: number;
  transactionLabel: string;
}) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <section className="card soft-shadow overflow-hidden p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <TrendingUp size={19} style={{ color }} />
      </div>
      <ReportTrend color={color} values={values} />
      <div className="mt-3 rounded-xl bg-[#f5f7f7] px-4 py-3 text-sm text-[#65717d]">
        {total > 0
          ? `${title.replace("趋势", "")}共计 ${transactionCount} 笔，金额 ¥${yuan(total)}`
          : `本月暂无${transactionLabel}流水`}
      </div>
      <div className="mt-3 divide-y divide-[#edf0f0]">
        {rows.length ? (
          rows.map((row) => {
            const amount =
              transactionLabel === "支出" ? row.expense : row.income;
            const count =
              transactionLabel === "支出" ? row.expenseCount : row.incomeCount;
            return (
              <div className="flex items-center gap-3 py-3" key={row.day}>
                <span
                  className="grid size-10 place-items-center rounded-full text-sm font-bold"
                  style={{ background: `${color}16`, color }}
                >
                  {row.day}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{row.day} 日</p>
                  <p className="text-xs text-[#929ba4]">
                    {count} 笔{transactionLabel}
                  </p>
                </div>
                <b className="money text-lg">¥{yuan(amount)}</b>
              </div>
            );
          })
        ) : (
          <p className="py-5 text-center text-sm text-[#98a1aa]">暂无数据</p>
        )}
      </div>
    </section>
  );
}

function LegacyReportsView() {
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-[#e8eeee] p-1 text-sm">
          <button className="rounded-lg px-5 py-2 text-[#66717d]">年</button>
          <button className="rounded-lg bg-white px-5 py-2 font-semibold text-[#ff714b] shadow-sm">
            月
          </button>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm">
          <ChevronLeft size={16} />
          2026 / 08
          <ChevronRight size={16} />
        </button>
        <button className="ml-auto flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm">
          <ListFilter size={16} />
          筛选
        </button>
      </section>
      <section className="flex gap-6 overflow-x-auto border-b border-[#dde7e7] pb-3 text-sm whitespace-nowrap">
        <b className="border-b-2 border-[#ff714b] pb-3 text-[#20252b]">趋势</b>
        {["大类", "小类", "成员", "账户", "商家", "标签"].map((x) => (
          <button className="text-[#707b86]" key={x}>
            {x}
          </button>
        ))}
      </section>
      <TrendCard
        title="支出趋势"
        color="#28c5b4"
        tooltip="2026年8月15日"
        amount="2,850.45"
        summary="2026年8月，支出共计 49 笔，总支出 6,345.54"
        rows={[
          ["15", "2026年8月15日", "3笔", "2850.45"],
          ["14", "2026年8月14日", "4笔", "75.70"],
          ["13", "2026年8月13日", "1笔", "14.00"],
        ]}
      />
      <TrendCard
        title="收入趋势"
        color="#ff714b"
        income
        tooltip="2026年8月15日"
        amount="21,089.00"
        summary="2026年8月，收入共计 3 笔，总收入 23,339.00"
        rows={[
          ["23", "2026年8月23日", "1笔", "250.00"],
          ["15", "2026年8月15日", "1笔", "21,089.00"],
          ["1", "2026年8月1日", "1笔", "2,000.00"],
        ]}
      />
    </div>
  );
}

function TrendCard({
  title,
  color,
  income,
  tooltip,
  amount,
  summary,
  rows,
}: {
  title: string;
  color: string;
  income?: boolean;
  tooltip: string;
  amount: string;
  summary: string;
  rows: string[][];
}) {
  return (
    <section className="card soft-shadow overflow-hidden p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex gap-3 text-[#77828d]">
          <TrendingUp size={19} />
          <ListFilter size={18} />
          <MoreHorizontal size={19} />
        </div>
      </div>
      <div className="relative">
        <MiniTrend color={color} income={income} />
        <div className="absolute left-[38%] top-1 rounded-xl bg-[#f1f3f4] px-3 py-2 text-xs leading-5 text-[#7d8792]">
          {tooltip}
          <br />
          <b className="money text-base text-[#293139]">{amount}</b>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-[#f5f7f7] px-4 py-3 text-sm text-[#65717d]">
        {summary}
      </div>
      <div className="mt-3 divide-y divide-[#edf0f0]">
        {rows.map(([day, date, count, money]) => (
          <div className="flex items-center gap-3 py-3" key={day}>
            <span
              className="grid size-10 place-items-center rounded-full text-sm font-bold"
              style={{ background: `${color}16`, color }}
            >
              {day}
            </span>
            <div className="flex-1">
              <p className="font-medium">{date}</p>
              <p className="text-xs text-[#929ba4]">{count}</p>
            </div>
            <b className="money text-lg">{money}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountsView() {
  const accounts = [
    ["微信支付", "2,867.20", "#28c5b4", Sparkles],
    ["支付宝", "4,128.63", "#5579de", Landmark],
    ["招商银行", "18,053.70", "#ff714b", Landmark],
    ["现金", "350.00", "#f49a5d", WalletCards],
  ];
  return (
    <div className="space-y-5">
      <section className="ripple-grid rounded-[28px] bg-[#0c6f78] p-7 text-white">
        <p className="text-sm text-[#c1e9e4]">总资产</p>
        <p className="money mt-2 text-4xl font-bold">¥25,399.53</p>
        <div className="mt-5 flex gap-6 text-sm">
          <span>负债 ¥0.00</span>
          <span>净资产 ¥25,399.53</span>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {accounts.map(([name, money, color, Icon]) => {
          const AccountIcon = Icon as typeof Sparkles;
          return (
            <div className="card p-5" key={name as string}>
              <div className="flex items-center justify-between">
                <span
                  className="grid size-10 place-items-center rounded-2xl"
                  style={{ background: `${color}17`, color: color as string }}
                >
                  <AccountIcon size={19} />
                </span>
                <Ellipsis size={18} className="text-[#9ba4ac]" />
              </div>
              <p className="mt-5 font-medium">{name as string}</p>
              <p className="money mt-1 text-2xl font-bold">
                ¥{money as string}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

type RecurringStore = ReturnType<typeof useRecurringEntries>;

function recurringLabel(entry: Pick<RecurringEntry, "intervalCount" | "intervalUnit">) {
  const unit = entry.intervalUnit === "day" ? "天" : entry.intervalUnit === "week" ? "周" : entry.intervalUnit === "month" ? "月" : "年";
  return entry.intervalCount === 1 ? `每${unit}` : `每 ${entry.intervalCount} ${unit}`;
}

function PlansView({ recurring, categories, accounts }: { recurring: RecurringStore; categories: LedgerCategory[]; accounts: { id: string; name: string; color: string }[] }) {
  const [tab, setTab] = useState<"active" | "ended">("active");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<RecurringEntry | null>(null);
  const [detail, setDetail] = useState<(RecurringEntry & { generated: { id: string; occurredAt: string; amountCents: number; note: string | null }[] }) | null>(null);
  const [message, setMessage] = useState("");
  const entries = tab === "active" ? recurring.active : recurring.ended;
  const openDetail = async (entry: RecurringEntry) => {
    try { setDetail(await recurring.get(entry.id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "读取详情失败"); }
  };
  const end = async (id: string) => {
    if (!window.confirm("结束后将不再生成未来流水，已生成流水会保留。确认结束？")) return;
    try { await recurring.end(id); setDetail(null); setMessage("周期账已结束"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
  };
  const archive = async (id: string) => {
    if (!window.confirm("删除会归档周期规则，已生成流水不会删除。确认继续？")) return;
    try { await recurring.archive(id); setDetail(null); setMessage("周期账已归档"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card soft-shadow overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#edf0f0] px-5 py-5 md:px-6"><div><h2 className="text-xl font-bold">周期账管理</h2><p className="mt-1 text-sm text-[#8b94a3]">固定的收入和支出，到期自动入账</p></div><button onClick={() => { setSelected(null); setFormOpen(true); }} className="rounded-xl bg-[#ff714b] px-4 py-2.5 text-sm font-bold text-white"><Plus className="mr-1 inline" size={17} />添加</button></div>
        <div className="flex border-b border-[#edf0f0] px-5 md:px-6"><button onClick={() => setTab("active")} className={`border-b-2 px-1 py-3 text-sm font-bold ${tab === "active" ? "border-[#0c6f78] text-[#0c6f78]" : "border-transparent text-[#8b94a3]"}`}>进行中 {recurring.active.length}</button><button onClick={() => setTab("ended")} className={`ml-6 border-b-2 px-1 py-3 text-sm font-bold ${tab === "ended" ? "border-[#ff714b] text-[#ff714b]" : "border-transparent text-[#8b94a3]"}`}>已终止 {recurring.ended.length}</button></div>
        <div className="divide-y divide-[#edf0f0]">{recurring.loading ? <p className="p-8 text-center text-sm text-[#8b94a3]">正在读取周期账…</p> : entries.length ? entries.map((entry) => <RecurringRow entry={entry} key={entry.id} onClick={() => void openDetail(entry)} />) : <div className="p-10 text-center"><Clock3 className="mx-auto text-[#aab4bd]" size={30} /><p className="mt-3 font-medium">{tab === "active" ? "还没有进行中的周期账" : "没有已终止的周期账"}</p><p className="mt-1 text-sm text-[#8b94a3]">例如每月房租、工资、订阅费用。</p></div>}</div>
      </section>
      {recurring.error && <p className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#c54c2c]">{recurring.error}</p>}
      {message && <p className="rounded-xl bg-[#eaf8f6] px-4 py-3 text-sm text-[#0c6f78]">{message}</p>}
      {formOpen && <RecurringForm entry={selected} categories={categories} accounts={accounts} onClose={() => setFormOpen(false)} onSave={async (input) => { if (selected) await recurring.update(selected.id, input); else await recurring.create(input); setFormOpen(false); setMessage(selected ? "周期账已更新" : "周期账已创建"); }} />}
      {detail && <RecurringDetail detail={detail} onClose={() => setDetail(null)} onEdit={() => { setSelected(detail); setDetail(null); setFormOpen(true); }} onEnd={() => void end(detail.id)} onArchive={() => void archive(detail.id)} />}
    </div>
  );
}

function RecurringRow({ entry, onClick }: { entry: RecurringEntry; onClick: () => void }) {
  const Icon = categoryIcon(entry.categoryIcon);
  const income = entry.transactionType === "income";
  return <button onClick={onClick} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#fafcfc] md:px-6"><span className={`grid size-11 place-items-center rounded-2xl ${income ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]"}`}><Icon size={21} /></span><div className="min-w-0 flex-1"><p className="font-semibold">{entry.categoryName}</p><p className="mt-1 truncate text-sm text-[#8b94a3]">{entry.note || "无备注"}</p><p className="mt-1 text-xs text-[#a2abb4]">{entry.status === "active" ? `下次 ${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.nextRunAt))}` : "已终止"} · {recurringLabel(entry)}</p></div><b className={`money text-xl ${income ? "text-[#ff714b]" : "text-[#20252b]"}`}>{income ? "+" : "-"}¥{yuan(entry.amountCents / 100)}</b><ChevronRight className="text-[#a5adb6]" size={18} /></button>;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function RecurringForm({ entry, categories, accounts, onClose, onSave }: {
  entry: RecurringEntry | null;
  categories: LedgerCategory[];
  accounts: { id: string; name: string; color: string }[];
  onClose: () => void;
  onSave: (input: RecurringInput) => Promise<void>;
}) {
  const [kind, setKind] = useState<"expense" | "income">(entry?.transactionType ?? "expense");
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? "");
  const expenseRoots = categories.filter((category) => category.kind === "expense" && !category.parentId);
  const [activeExpenseParentId, setActiveExpenseParentId] = useState(() => {
    const selected = categories.find((category) => category.id === entry?.categoryId);
    return selected?.parentId ?? expenseRoots[0]?.id ?? "";
  });
  const expenseChildren = categories.filter((category) => category.kind === "expense" && category.parentId === activeExpenseParentId);
  const incomeCategories = categories.filter((category) => category.kind === "income" && !category.parentId);
  const [accountId, setAccountId] = useState(entry?.accountId ?? "");
  const [amount, setAmount] = useState(entry ? String(entry.amountCents / 100) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [intervalCount, setIntervalCount] = useState(String(entry?.intervalCount ?? 1));
  const [intervalUnit, setIntervalUnit] = useState<RecurringInput["intervalUnit"]>(entry?.intervalUnit ?? "month");
  const [startAt, setStartAt] = useState(toDateTimeLocal(entry?.startAt) || toDateTimeLocal(new Date().toISOString()));
  const [hasEndAt, setHasEndAt] = useState(Boolean(entry?.endAt));
  const [endAt, setEndAt] = useState(toDateTimeLocal(entry?.endAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const setTransactionKind = (next: "expense" | "income") => { setKind(next); setCategoryId(""); };
  const submit = async () => {
    const amountCents = Math.round(Number(amount) * 100);
    const count = Number(intervalCount);
    if (!categoryId) { setError("请选择分类。"); return; }
    if (!Number.isFinite(amountCents) || amountCents <= 0) { setError("请输入大于 0 的金额。"); return; }
    if (!startAt) { setError("请选择开始时间。"); return; }
    setSaving(true); setError("");
    try { await onSave({ transactionType: kind, categoryId, accountId: accountId || null, amountCents, note, intervalCount: count, intervalUnit, startAt: new Date(startAt).toISOString(), endAt: hasEndAt && endAt ? new Date(endAt).toISOString() : null }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败。"); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-end bg-[#102124]/35 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-5"><section className="max-h-[100dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#f5f7f7] shadow-2xl md:max-w-[620px] md:rounded-[28px]"><header className="flex items-center justify-between bg-[#0c6f78] px-5 py-5 text-white md:px-6"><div><p className="text-lg font-bold">{entry ? "编辑周期账" : "新增周期账"}</p><p className="mt-1 text-sm text-white/70">到期后会自动生成一笔流水</p></div><button onClick={onClose} disabled={saving} className="grid size-9 place-items-center rounded-full bg-white/10"><X size={19} /></button></header><div className="space-y-5 p-5 md:p-6"><div className="grid grid-cols-2 rounded-2xl bg-[#e8eeee] p-1"><button onClick={() => setTransactionKind("expense")} disabled={saving} className={`rounded-xl py-2.5 text-sm font-bold ${kind === "expense" ? "bg-white text-[#0c6f78] shadow-sm" : "text-[#84909a]"}`}>支出</button><button onClick={() => setTransactionKind("income")} disabled={saving} className={`rounded-xl py-2.5 text-sm font-bold ${kind === "income" ? "bg-white text-[#ff714b] shadow-sm" : "text-[#84909a]"}`}>收入</button></div><section><div className="flex items-baseline justify-between"><p className="text-sm font-bold text-[#4d5863]">分类</p><p className="text-xs text-[#98a1aa]">{kind === "expense" ? "先选大类，再选小类" : "选择收入分类"}</p></div>{kind === "expense" ? <div className="mt-2 space-y-3"><div className="flex gap-2 overflow-x-auto pb-1">{expenseRoots.map((category) => { const Icon = categoryIcon(category.icon); const selected = category.id === activeExpenseParentId; return <button key={category.id} onClick={() => { setActiveExpenseParentId(category.id); if (categories.find((item) => item.id === categoryId)?.parentId !== category.id) setCategoryId(""); }} disabled={saving} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${selected ? "border-[#28c5b4] bg-[#e4f7f4] text-[#0c6f78]" : "border-[#dde5e5] bg-white text-[#66727d]"}`}><Icon size={16} />{category.name}</button>; })}</div><div className="rounded-2xl bg-white p-3"><p className="mb-2 text-xs font-bold text-[#8b94a3]">选择小类</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{expenseChildren.map((category) => { const Icon = categoryIcon(category.icon); const selected = category.id === categoryId; return <button key={category.id} onClick={() => setCategoryId(category.id)} disabled={saving} className={`grid min-h-20 place-items-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium transition ${selected ? "border-[#28c5b4] bg-[#e4f7f4] text-[#0c6f78]" : "border-[#edf0f0] text-[#66727d] hover:bg-[#f8fbfb]"}`}><Icon size={18} /><span className="max-w-full truncate">{category.name}</span></button>; })}</div>{!expenseChildren.length && <p className="py-4 text-center text-sm text-[#8b94a3]">这个大类还没有小类，请先到分类管理中添加。</p>}</div></div> : <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 sm:grid-cols-4">{incomeCategories.map((category) => { const Icon = categoryIcon(category.icon); const selected = category.id === categoryId; return <button key={category.id} onClick={() => setCategoryId(category.id)} disabled={saving} className={`grid min-h-20 place-items-center gap-1 rounded-xl border px-1 py-2 text-xs font-medium transition ${selected ? "border-[#ff714b] bg-[#fff0eb] text-[#ff714b]" : "border-[#edf0f0] text-[#66727d] hover:bg-[#fff9f7]"}`}><Icon size={18} /><span className="max-w-full truncate">{category.name}</span></button>; })}</div>}</section><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-[#4d5863]">金额<input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="0.00" disabled={saving} className="money mt-2 w-full rounded-xl border border-[#dde5e5] bg-white px-3 py-3 text-xl font-bold outline-none" /></label><label className="block text-sm font-bold text-[#4d5863]">账户（可选）<select value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={saving} className="mt-2 w-full rounded-xl border border-[#dde5e5] bg-white px-3 py-3 font-normal outline-none"><option value="">不指定账户</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><label className="block text-sm font-bold text-[#4d5863]">开始时间<input value={startAt} onChange={(event) => setStartAt(event.target.value)} type="datetime-local" disabled={saving} className="mt-2 w-full rounded-xl border border-[#dde5e5] bg-white px-3 py-3 font-normal outline-none" /></label><div><p className="text-sm font-bold text-[#4d5863]">重复周期</p><div className="mt-2 flex gap-2"><input value={intervalCount} onChange={(event) => setIntervalCount(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" disabled={saving} className="w-24 rounded-xl border border-[#dde5e5] bg-white px-3 py-3 text-center font-bold outline-none" /><select value={intervalUnit} onChange={(event) => setIntervalUnit(event.target.value as RecurringInput["intervalUnit"])} disabled={saving} className="flex-1 rounded-xl border border-[#dde5e5] bg-white px-3 py-3 outline-none"><option value="day">天</option><option value="week">周</option><option value="month">月</option><option value="year">年</option></select></div></div><div className="rounded-2xl bg-white p-4"><label className="flex items-center justify-between gap-3 text-sm font-bold text-[#4d5863]"><span>设置结束时间</span><input checked={hasEndAt} onChange={(event) => setHasEndAt(event.target.checked)} disabled={saving} className="size-4 accent-[#0c6f78]" type="checkbox" /></label>{hasEndAt && <input value={endAt} onChange={(event) => setEndAt(event.target.value)} type="datetime-local" disabled={saving} className="mt-3 w-full rounded-xl border border-[#dde5e5] px-3 py-3 font-normal outline-none" />}</div><label className="block text-sm font-bold text-[#4d5863]">备注<input value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} placeholder="例如：每月房租" className="mt-2 w-full rounded-xl border border-[#dde5e5] bg-white px-3 py-3 font-normal outline-none" /></label>{error && <p className="rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[#c54c2c]">{error}</p>}<button onClick={() => void submit()} disabled={saving} className="w-full rounded-2xl bg-[#0c6f78] py-3.5 font-bold text-white disabled:opacity-60">{saving ? "正在保存…" : "保存周期账"}</button></div></section></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-5 py-3 text-sm"><span className="text-[#8b94a3]">{label}</span><span className="text-right font-medium text-[#3f4852]">{value}</span></div>; }

function RecurringDetail({ detail, onClose, onEdit, onEnd, onArchive }: { detail: RecurringEntry & { generated: { id: string; occurredAt: string; amountCents: number; note: string | null }[] }; onClose: () => void; onEdit: () => void; onEnd: () => void; onArchive: () => void }) {
  const income = detail.transactionType === "income"; const Icon = categoryIcon(detail.categoryIcon); const formatDate = (value: string) => new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#102124]/35 p-4 backdrop-blur-sm"><section className="max-h-[90dvh] w-full max-w-[580px] overflow-y-auto rounded-[28px] bg-[#f5f7f7] shadow-2xl"><header className="flex items-center justify-between bg-[#0c6f78] px-6 py-5 text-white"><div><p className="text-lg font-bold">周期账详情</p><p className="mt-1 text-sm text-white/70">{detail.status === "active" ? "正在进行" : "已终止"}</p></div><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/10"><X size={19} /></button></header><div className="space-y-4 p-5 md:p-6"><section className="rounded-2xl bg-white p-5"><div className="flex items-center gap-3"><span className={`grid size-12 place-items-center rounded-2xl ${income ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]"}`}><Icon size={23} /></span><div className="min-w-0 flex-1"><p className="font-bold">{detail.categoryName}</p><p className="mt-1 text-sm text-[#8b94a3]">{detail.note || "无备注"}</p></div><b className={`money text-2xl ${income ? "text-[#ff714b]" : "text-[#20252b]"}`}>{income ? "+" : "-"}¥{yuan(detail.amountCents / 100)}</b></div><div className="mt-4 divide-y divide-[#edf0f0]"><DetailRow label="账户" value={detail.accountName || "未指定账户"} /><DetailRow label="重复" value={recurringLabel(detail)} /><DetailRow label="开始" value={formatDate(detail.startAt)} /><DetailRow label="下次入账" value={detail.status === "active" ? formatDate(detail.nextRunAt) : "已结束"} />{detail.endAt && <DetailRow label="结束时间" value={formatDate(detail.endAt)} />}</div></section><section className="rounded-2xl bg-white p-5"><div className="flex items-center justify-between"><p className="font-bold">已生成流水</p><span className="text-sm text-[#8b94a3]">共 {detail.generated.length} 笔</span></div>{detail.generated.length ? <div className="mt-3 divide-y divide-[#edf0f0]">{detail.generated.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between py-3 text-sm"><span className="text-[#68737d]">{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.occurredAt))}</span><b className={`money ${income ? "text-[#ff714b]" : "text-[#20252b]"}`}>{income ? "+" : "-"}¥{yuan(item.amountCents / 100)}</b></div>)}</div> : <p className="mt-3 text-sm text-[#8b94a3]">尚未到生成时间。</p>}</section><div className="grid gap-3 sm:grid-cols-2"><button onClick={onEdit} className="rounded-2xl bg-[#0c6f78] py-3 font-bold text-white">编辑</button>{detail.status === "active" ? <button onClick={onEnd} className="rounded-2xl border border-[#f2c1b6] bg-[#fff8f6] py-3 font-bold text-[#d55a3e]">结束周期账</button> : <button onClick={onArchive} className="rounded-2xl border border-[#e1e5e6] bg-white py-3 font-bold text-[#68737d]">归档规则</button>}</div>{detail.status === "active" && <button onClick={onArchive} className="w-full py-2 text-sm font-medium text-[#9aa4ad] underline underline-offset-4">删除并归档此规则</button>}</div></section></div>;
}

function Composer({
  kind,
  setKind,
  selectedCategory,
  selectedCategoryId,
  setSelectedCategoryId,
  categories,
  allCategories,
  pickerOpen,
  setPickerOpen,
  createCategory,
  updateCategory,
  archiveCategory,
  amount,
  note,
  occurredAt,
  setOccurredAt,
  editing,
  saving,
  inputNumber,
  onAmountChange,
  setNote,
  onClose,
  onSave,
  SelectedIcon,
}: {
  kind: TransactionKind;
  setKind: (kind: TransactionKind) => void;
  selectedCategory?: LedgerCategory;
  selectedCategoryId: string;
  setSelectedCategoryId: (categoryId: string) => void;
  categories: LedgerCategory[];
  allCategories: LedgerCategory[];
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  createCategory: (input: { name: string; kind: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string }) => Promise<LedgerCategory>;
  updateCategory: (id: string, input: { name: string; kind: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string }) => Promise<LedgerCategory>;
  archiveCategory: (id: string) => Promise<LedgerCategory>;
  amount: string;
  note: string;
  occurredAt: string;
  setOccurredAt: (value: string) => void;
  editing: boolean;
  saving: boolean;
  inputNumber: (value: string) => void;
  onAmountChange: (value: string) => void;
  setNote: (note: string) => void;
  onClose: () => void;
  onSave: () => void;
  SelectedIcon: typeof Utensils;
}) {
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<"manage" | "new" | null>(null);
  const tabs: [TransactionKind, string, typeof ArrowDownLeft][] = [
    ["expense", "支出", ArrowUpRight],
    ["income", "收入", ArrowDownLeft],
  ];
  const keypad = [
    "1",
    "2",
    "3",
    "⌫",
    "4",
    "5",
    "6",
    "clear",
    "7",
    "8",
    "9",
    ".",
    "0",
  ];
  const roots = allCategories.filter(
    (category) => category.kind === "expense" && !category.parentId,
  );
  const pickerItems =
    kind === "income"
      ? allCategories.filter(
          (category) => category.kind === "income" && !category.parentId,
        )
      : activeParentId
        ? allCategories.filter(
            (category) =>
              category.kind === "expense" && category.parentId === activeParentId,
          )
        : roots;
  const activeParent = roots.find((category) => category.id === activeParentId);
  const selectCategory = (category: LedgerCategory) => {
    setSelectedCategoryId(category.id);
    setPickerOpen(false);
    setActiveParentId(null);
  };
  const incomeMode = kind === "income";
  const selectedCategoryStyle = incomeMode
    ? "bg-[#ff714b] text-white shadow-[0_8px_16px_rgba(255,113,75,.28)]"
    : "bg-[#28c5b4] text-white shadow-[0_8px_16px_rgba(40,197,180,.28)]";
  const categoryIconStyle = incomeMode
    ? "bg-[#fff0eb] text-[#ff714b]"
    : "bg-[#e4f7f4] text-[#28b9aa]";
  const selectedTextStyle = incomeMode ? "text-[#ff714b]" : "text-[#0c6f78]";

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-[#0f2225]/35 p-0 backdrop-blur-[2px] md:items-center md:justify-center md:p-6">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f5f7f7] md:h-[min(820px,92dvh)] md:max-w-[790px] md:rounded-[30px] md:shadow-2xl">
        <header className="relative overflow-hidden bg-[#0c6f78] px-5 pb-7 pt-5 text-white md:px-8">
          <div className="absolute inset-0 opacity-60 ripple-grid" />
          <div className="relative flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={saving}
              className="grid size-9 place-items-center rounded-full bg-white/10"
            >
              <X size={20} />
            </button>
            <button className="flex items-center gap-1 font-semibold">
              {editing ? "编辑流水" : "日常账本"} <ChevronDown size={15} />
            </button>
            <button className="grid size-9 place-items-center rounded-full bg-white/10">
              <Settings2 size={18} />
            </button>
          </div>
          <div className="relative mt-6 flex justify-around">
            {tabs.map(([id, label, Icon]) => (
              <button
                onClick={() => {
                  setKind(id);
                }}
                disabled={saving}
                className={`flex flex-col items-center gap-1 text-sm ${kind === id ? "font-bold text-white" : "text-white/60"}`}
                key={id}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full ${kind === id ? "bg-white text-[#0c6f78]" : ""}`}
                >
                  <Icon size={17} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </header>
        <div className="relative -mt-3 mx-4 flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-lg md:mx-7">
          <span className={`grid size-11 place-items-center rounded-2xl ${categoryIconStyle}`}>
            <SelectedIcon size={23} />
          </span>
          <button
            onClick={() => setPickerOpen(true)}
            disabled={saving}
            className="flex min-w-0 items-center gap-1 text-left text-lg font-bold"
          >
            <span className="truncate">{selectedCategory?.name ?? "选择分类"}</span>
            <ChevronDown size={16} />
          </button>
          <input
            value={amount === "0" ? "0" : amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="decimal"
            pattern="[0-9]*[.]?[0-9]*"
            aria-label="金额"
            style={{ fontSize: "2.25rem", fontWeight: 700, lineHeight: 1 }}
            className="money ml-auto min-w-0 flex-1 bg-transparent text-right text-4xl font-bold text-[#20252b] outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-7 md:px-8">
          <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-6">
            {categories.map((category) => {
              const CategoryIcon = categoryIcon(category.icon);
              const selected = category.id === selectedCategoryId;
              return (
                <button
                  onClick={() => setSelectedCategoryId(category.id)}
                  disabled={saving}
                  className="grid place-items-center gap-2 text-center text-sm text-[#4e5863]"
                  key={category.id}
                >
                  <span
                    className={`grid size-11 place-items-center rounded-2xl ${selected ? selectedCategoryStyle : "bg-[#e9edef] text-[#9aa4b1]"}`}
                  >
                    <CategoryIcon size={21} />
                  </span>
                  <span className={selected ? "font-bold text-[#20252b]" : ""}>
                    {category.name}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setPickerOpen(true)}
              disabled={saving}
              className="grid place-items-center gap-2 text-center text-sm text-[#4e5863]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-[#e9edef] text-[#778391]">
                <MoreHorizontal size={22} />
              </span>
              <span>全部</span>
            </button>
          </div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving}
            className="mt-10 w-full bg-transparent text-base outline-none placeholder:text-[#a7b0bb]"
            placeholder="输入备注…"
          />
          <label className="mt-5 block text-sm font-medium text-[#71808b]">
            发生时间
            <span className="mt-2 flex items-center rounded-xl bg-white px-3 py-2.5 shadow-sm">
              <CalendarDays size={16} className="mr-2 shrink-0 text-[#0c6f78]" />
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                disabled={saving}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#3f4852] outline-none"
                aria-label="发生日期和时间"
              />
            </span>
          </label>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {["支付宝", "自己", "商家", "标签"].map(
              (item, index) => (
                <button
                  className="shrink-0 rounded-full bg-white px-3 py-2 text-sm text-[#53606b] shadow-sm"
                  key={item}
                >
                  {index === 1 && (
                    <Sparkles
                      className="mr-1 inline text-[#28c5b4]"
                      size={14}
                    />
                  )}{" "}
                  {item}
                </button>
              ),
            )}
            <button className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#53606b]">
              <Camera size={18} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-[#596171] bg-[#424958] text-white">
          {keypad.map((key) => (
            <button
              onClick={() => inputNumber(key)}
              disabled={saving}
              className="h-[56px] border-b border-r border-[#566071] text-xl transition hover:bg-[#4d5666] active:bg-[#586273] md:h-[62px]"
              key={key}
            >
              {key === "clear" ? "清空" : key}
            </button>
          ))}
          <button
            onClick={onSave}
            disabled={saving}
            className="col-span-3 h-[56px] bg-[#ff714b] text-lg font-bold transition hover:bg-[#f7653f] active:bg-[#e95a37] disabled:cursor-wait disabled:opacity-70 md:h-[62px]"
          >
            {saving ? "保存中…" : editing ? "保存修改" : "保存"}
          </button>
        </div>
      </section>
      {pickerOpen && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/35 md:items-center md:justify-center">
          <section className="max-h-[82dvh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-w-[560px] md:rounded-[28px]">
            <header className="flex items-center justify-between border-b border-[#edf0f0] px-5 py-4">
              <button
                onClick={() => {
                  if (activeParentId) setActiveParentId(null);
                  else setPickerOpen(false);
                }}
                className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="font-bold">选择分类</p>
                {activeParent && <p className="text-xs text-[#8b94a3]">{activeParent.name}</p>}
              </div>
              <button onClick={() => setPickerOpen(false)} className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]">
                <X size={18} />
              </button>
            </header>
            <div className="max-h-[54dvh] overflow-y-auto px-5 py-3">
              {pickerItems.map((category) => {
                const Icon = categoryIcon(category.icon);
                const isParent = kind === "expense" && !activeParentId;
                return (
                  <button
                    key={category.id}
                    onClick={() => isParent ? setActiveParentId(category.id) : selectCategory(category)}
                    className="flex w-full items-center gap-3 border-b border-[#f0f2f2] py-4 text-left last:border-0"
                  >
                    <span className={`grid size-10 place-items-center rounded-2xl ${categoryIconStyle}`}>
                      <Icon size={20} />
                    </span>
                    <span className="flex-1 font-medium">{category.name}</span>
                    {isParent ? <ChevronRight size={18} className="text-[#a5adb6]" /> : category.id === selectedCategoryId ? <span className={`text-sm font-bold ${selectedTextStyle}`}>已选</span> : null}
                  </button>
                );
              })}
              {!pickerItems.length && (
                <p className="py-10 text-center text-sm text-[#8b94a3]">当前大类还没有小类。</p>
              )}
            </div>
            <footer className="flex border-t border-[#edf0f0] text-[#ff714b]">
              <button onClick={() => setAdminMode("new")} className="flex-1 py-4 text-sm font-bold">+ 新增分类</button>
              <button onClick={() => setAdminMode("manage")} className="flex-1 border-l border-[#edf0f0] py-4 text-sm font-bold">管理</button>
            </footer>
          </section>
        </div>
      )}
      {adminMode && (
        <CategoryAdminDialog
          startMode={adminMode}
          initialKind={kind}
          initialParentId={kind === "expense" ? activeParentId : null}
          categories={allCategories}
          createCategory={createCategory}
          updateCategory={updateCategory}
          archiveCategory={archiveCategory}
          onClose={() => setAdminMode(null)}
          onCreated={(category) => {
            setAdminMode(null);
            if (category.kind === "income" || category.parentId) {
              setSelectedCategoryId(category.id);
              setPickerOpen(false);
              setActiveParentId(null);
            } else {
              setPickerOpen(true);
              setActiveParentId(category.id);
            }
          }}
        />
      )}
    </div>
  );
}

function CategoryAdminDialog({
  startMode,
  initialKind,
  initialParentId,
  categories,
  createCategory,
  updateCategory,
  archiveCategory,
  onClose,
  onCreated,
}: {
  startMode: "manage" | "new";
  initialKind: TransactionKind;
  initialParentId: string | null;
  categories: LedgerCategory[];
  createCategory: (input: { name: string; kind: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string }) => Promise<LedgerCategory>;
  updateCategory: (id: string, input: { name: string; kind: "expense" | "income"; parentId?: string | null; icon?: string | null; color?: string }) => Promise<LedgerCategory>;
  archiveCategory: (id: string) => Promise<LedgerCategory>;
  onClose: () => void;
  onCreated: (category: LedgerCategory) => void;
}) {
  const iconChoices = [
    ["shopping-bag", "购物"],
    ["utensils", "餐饮"],
    ["car", "交通"],
    ["home", "居家"],
    ["heart", "人情"],
    ["wallet", "收入"],
    ["badge-plus", "新增"],
    ["trending-up", "投资"],
    ["sparkles", "娱乐"],
    ["zap", "数码"],
    ["coffee", "咖啡"],
    ["plane", "出行"],
    ["bike", "骑行"],
    ["shirt", "服饰"],
  ] as const;
  const [mode, setMode] = useState<"manage" | "form">(startMode === "new" ? "form" : "manage");
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("shopping-bag");
  const [editing, setEditing] = useState<LedgerCategory | null>(null);
  const [managedParentId, setManagedParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const roots = categories.filter((category) => category.kind === "expense" && !category.parentId);
  const managedParent = roots.find((category) => category.id === managedParentId);
  const displayed = categories.filter((category) => category.kind === kind && (kind === "income" || (managedParentId ? category.parentId === managedParentId : !category.parentId)));
  const beginNew = (targetKind = kind, targetParentId: string | null = null) => {
    setEditing(null); setKind(targetKind); setParentId(targetParentId); setName(""); setIcon(targetKind === "income" ? "badge-plus" : "shopping-bag"); setMessage(""); setMode("form");
  };
  const beginEdit = (category: LedgerCategory) => {
    setEditing(category); setKind(category.kind); setParentId(category.parentId); setName(category.name); setIcon(category.icon ?? "shopping-bag"); setMessage(""); setMode("form");
  };
  const submit = async () => {
    try {
      setSaving(true); setMessage("");
      const input = { name, kind, parentId: kind === "income" ? null : parentId, icon, color: kind === "income" ? "#ff714b" : "#28c5b4" };
      const category = editing ? await updateCategory(editing.id, input) : await createCategory(input);
      if (!editing) onCreated(category);
      else { setMessage("已保存"); setMode("manage"); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  };
  const archive = async (category: LedgerCategory) => {
    if (!window.confirm(`归档“${category.name}”？历史流水会保留该分类，但以后不能再选择它。`)) return;
    try { setSaving(true); await archiveCategory(category.id); }
    catch (error) { setMessage(error instanceof Error ? error.message : "归档失败"); }
    finally { setSaving(false); }
  };
  const selectedIcon = categoryIcon(icon);
  const SelectedIcon = selectedIcon;
  const iconColor = kind === "income" ? "#ff714b" : "#28c5b4";
  const iconSurface = kind === "income" ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]";
  return (
    <div className="absolute inset-0 z-20 flex items-end bg-black/40 md:items-center md:justify-center">
      <section className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#f5f7f7] md:max-w-[600px] md:rounded-[28px]">
        <header className="flex items-center justify-between bg-white px-5 py-4">
          <button onClick={() => mode === "form" ? setMode("manage") : managedParentId ? setManagedParentId(null) : onClose()} className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]"><ChevronLeft size={20} /></button>
          <p className="text-lg font-bold">{mode === "form" ? (editing ? "编辑分类" : "新增分类") : managedParent ? `${managedParent.name}小类` : "分类管理"}</p>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#f2f5f5]"><X size={18} /></button>
        </header>
        {mode === "manage" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex rounded-xl bg-white p-1">
              {(["expense", "income"] as TransactionKind[]).map((item) => <button key={item} onClick={() => setKind(item)} className={`flex-1 rounded-lg py-2 text-sm font-bold ${kind === item ? item === "income" ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#0c6f78]" : "text-[#7d8792]"}`}>{item === "expense" ? "支出" : "收入"}</button>)}
            </div>
            <button onClick={() => beginNew(kind, kind === "expense" ? managedParentId : null)} className="mb-3 w-full rounded-xl border border-dashed border-[#ffb09e] bg-white py-3 text-sm font-bold text-[#ff714b]">+ 新增{kind === "income" ? "收入分类" : managedParentId ? "小类" : "支出大类"}</button>
            <div className="overflow-hidden rounded-2xl bg-white">
              {displayed.map((category) => {
                const Icon = categoryIcon(category.icon);
                const childCount = kind === "expense" ? categories.filter((item) => item.parentId === category.id).length : 0;
                const isRoot = kind === "expense" && !managedParentId;
                return <div key={category.id} className="flex items-center gap-3 border-b border-[#eef1f1] px-4 py-3 last:border-0"><span className={`grid size-9 place-items-center rounded-xl ${kind === "income" ? "bg-[#fff0eb] text-[#ff714b]" : "bg-[#e4f7f4] text-[#28b9aa]"}`}><Icon size={18} /></span><button onClick={() => isRoot ? setManagedParentId(category.id) : beginEdit(category)} className="min-w-0 flex-1 text-left"><p className="font-medium">{category.name}</p><p className="text-xs text-[#8b94a3]">{childCount ? `${childCount} 个小类` : kind === "income" ? "收入分类" : "支出小类"}</p></button>{isRoot && <button onClick={() => beginEdit(category)} className="text-xs font-bold text-[#0c6f78]">编辑</button>}<button disabled={saving} onClick={() => archive(category)} className="text-xs text-[#a06d64]">归档</button>{isRoot && <ChevronRight size={16} className="text-[#a5adb6]" />}</div>;
              })}
            </div>
            {message && <p className="mt-3 text-center text-sm text-[#c54c2c]">{message}</p>}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="rounded-2xl bg-white p-4">
              {!editing && <div className="mb-4 flex rounded-xl bg-[#f3f5f5] p-1">{(["expense", "income"] as TransactionKind[]).map((item) => <button key={item} onClick={() => { setKind(item); setParentId(null); }} className={`flex-1 rounded-lg py-2 text-sm font-bold ${kind === item ? item === "income" ? "bg-white text-[#ff714b] shadow-sm" : "bg-white text-[#0c6f78] shadow-sm" : "text-[#7d8792]"}`}>{item === "expense" ? "支出" : "收入"}</button>)}</div>}
              <label className="block text-sm text-[#7d8792]">名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} className="mt-2 w-full rounded-xl bg-[#f5f7f7] px-3 py-3 text-base text-[#20252b] outline-none" placeholder="请输入分类名称" /></label>
              {kind === "expense" && <label className="mt-4 block text-sm text-[#7d8792]">所属大类<select value={parentId ?? ""} onChange={(event) => setParentId(event.target.value || null)} className="mt-2 w-full rounded-xl bg-[#f5f7f7] px-3 py-3 text-base text-[#20252b] outline-none"><option value="">无（创建支出大类）</option>{roots.filter((root) => !editing || root.id !== editing.id).map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}</select></label>}
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-[#7d8792]">
                  <span>选择图标</span>
                  <span className="flex items-center gap-2 text-xs font-medium text-[#53606b]"><span className={`grid size-7 place-items-center rounded-lg ${iconSurface}`}><SelectedIcon size={15} /></span>{iconChoices.find(([value]) => value === icon)?.[1] ?? "自定义"}</span>
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2 rounded-2xl bg-[#f5f7f7] p-3 sm:grid-cols-8">
                  {iconChoices.map(([value, label]) => {
                    const Icon = categoryIcon(value);
                    const selected = value === icon;
                    return <button type="button" key={value} onClick={() => setIcon(value)} aria-label={label} title={label} className={`grid aspect-square place-items-center rounded-xl transition ${selected ? "text-white shadow-sm" : "bg-white text-[#8893a1] hover:text-[#53606b]"}`} style={selected ? { backgroundColor: iconColor } : undefined}><Icon size={19} /></button>;
                  })}
                </div>
              </div>
            </div>
            {message && <p className="mt-3 text-center text-sm text-[#c54c2c]">{message}</p>}
            <button disabled={saving} onClick={submit} className="mt-5 w-full rounded-2xl bg-[#ff714b] py-3.5 font-bold text-white disabled:opacity-60">{saving ? "保存中…" : "保存"}</button>
          </div>
        )}
      </section>
    </div>
  );
}
function ImportDialog({
  step,
  setStep,
  onClose,
}: {
  step: "choose" | "preview" | "done";
  setStep: (s: "choose" | "preview" | "done") => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedStatement | null>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const openFilePicker = () => inputRef.current?.click();
  const readFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setParsing(true);
    try {
      setParsed(await parseStatementFile(file));
      setStep("preview");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "文件解析失败，请换一个账单文件后重试。",
      );
    } finally {
      setParsing(false);
    }
  };
  const previewRows = parsed?.rows.slice(0, 4) ?? [];
  const sourceName =
    parsed?.source === "alipay"
      ? "支付宝"
      : parsed?.source === "wechat"
        ? "微信支付"
        : "通用账单";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102124]/35 p-4 backdrop-blur-sm">
      <section className="w-full max-w-[620px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#ebeeee] px-6 py-5">
          <div>
            <p className="text-lg font-bold">导入账单</p>
            <p className="mt-1 text-sm text-[#8b94a3]">
              原始文件只在你的浏览器中解析
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-[#f3f6f6]"
          >
            <X size={19} />
          </button>
        </header>
        <input
          ref={inputRef}
          onChange={(event) => readFile(event.target.files?.[0])}
          accept=".csv,.xlsx,.xls,.zip"
          className="hidden"
          type="file"
        />
        {step === "choose" && (
          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={openFilePicker}
                className="rounded-2xl border-2 border-[#e4efee] p-5 text-left transition hover:border-[#28c5b4] hover:bg-[#f5fcfb]"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-[#e4f7f4] text-[#0c6f78]">
                  <Sparkles size={22} />
                </span>
                <p className="mt-4 font-bold">导入微信支付账单</p>
                <p className="mt-1 text-sm leading-5 text-[#8b94a3]">
                  支持 CSV、Excel 与压缩文件
                </p>
              </button>
              <button
                onClick={openFilePicker}
                className="rounded-2xl border-2 border-[#e4efee] p-5 text-left transition hover:border-[#5579de] hover:bg-[#f5f7ff]"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-[#edf0ff] text-[#5579de]">
                  <Landmark size={22} />
                </span>
                <p className="mt-4 font-bold">导入支付宝账单</p>
                <p className="mt-1 text-sm leading-5 text-[#8b94a3]">
                  支持 CSV、Excel 与压缩文件
                </p>
              </button>
            </div>
            <button
              disabled={parsing}
              onClick={openFilePicker}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#a7c6c4] bg-[#f8fcfc] px-4 py-5 text-sm font-medium text-[#0c6f78] disabled:opacity-60"
            >
              <FileUp size={19} />
              {parsing ? "正在本地解析…" : "选择本地账单文件"}
            </button>
            {error && (
              <p className="mt-3 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[#c54c2c]">
                {error}
              </p>
            )}
            <p className="mt-3 text-center text-xs leading-5 text-[#98a1aa]">
              不需要微信或支付宝密码，也不会上传你的原始账单文件。
            </p>
          </div>
        )}
        {step === "preview" && parsed && (
          <div className="p-6">
            <div className="rounded-2xl bg-[#eaf8f6] p-4">
              <p className="font-bold text-[#0c6f78]">
                已识别：{sourceName}账单
              </p>
              <p className="mt-1 text-sm text-[#47716f]">
                {parsed.filename} · 已解析 {parsed.rows.length} 条有效记录
              </p>
              <div className="mt-3 flex gap-4 text-sm">
                <span>
                  <b>{parsed.rows.length}</b> 待导入
                </span>
                <span>
                  <b>{parsed.skipped}</b> 跳过空行/异常
                </span>
                <span>
                  <b>
                    {
                      parsed.rows.filter((row) => row.direction === "unknown")
                        .length
                    }
                  </b>{" "}
                  待确认
                </span>
              </div>
            </div>
            <div className="mt-5 divide-y divide-[#edf0f0]">
              {previewRows.map((row) => (
                <div
                  className="flex items-center gap-3 py-3"
                  key={row.rowNumber}
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-[#e4f7f4] text-xs font-bold text-[#0c6f78]">
                    {row.category.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.merchantName}
                    </p>
                    <p className="text-xs text-[#8b94a3]">
                      {row.occurredAt || "日期待确认"} · {row.category}
                    </p>
                  </div>
                  <b className="money text-sm">
                    {row.direction === "income" ? "+" : "-"}¥
                    {yuan(row.amountCents / 100)}
                  </b>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStep("choose")}
                className="flex-1 rounded-xl bg-[#f0f4f4] py-3 text-sm font-semibold"
              >
                返回
              </button>
              <button
                onClick={() => setStep("done")}
                className="flex-[1.6] rounded-xl bg-[#0c6f78] py-3 text-sm font-bold text-white"
              >
                确认导入 {parsed.rows.length} 笔
              </button>
            </div>
          </div>
        )}
        {step === "done" && (
          <div className="p-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e4f7f4] text-[#0c6f78]">
              <TrendingUp size={30} />
            </span>
            <p className="mt-5 text-xl font-bold">账单已整理完成</p>
            <p className="mt-2 text-sm leading-6 text-[#7d8792]">
              已完成本地解析与导入确认。
              <br />
              配置 Supabase 后，确认结果将写入你的私有云端账本。
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-[#0c6f78] px-8 py-3 text-sm font-bold text-white"
            >
              查看本月报表
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
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
  Landmark,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Settings2,
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
  type LedgerTransaction,
} from "@/features/ledger/use-ledger";
import { useSession } from "@/lib/auth/client";

type View = "home" | "reports" | "accounts" | "plans" | "transactions";
type TransactionKind = "expense" | "income" | "transfer";

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "accounts", label: "账户", icon: WalletCards },
  { id: "plans", label: "计划", icon: Target },
  { id: "home", label: "首页", icon: Home },
  { id: "reports", label: "报表", icon: BarChart3 },
];

const expenseCategories = [
  ["早餐", Coffee],
  ["午餐", Utensils],
  ["晚餐", Utensils],
  ["饮料水果", Sparkles],
  ["买菜原料", ShoppingBag],
  ["家居百货", Home],
  ["打车", ArrowLeftRight],
  ["零食", Coffee],
  ["医疗药品", CircleDollarSign],
  ["电子数码", Zap],
  ["服饰鞋包", ShoppingBag],
  ["水电燃气", Landmark],
];
const incomeCategories = [
  ["工资薪水", WalletCards],
  ["报销", ReceiptText],
  ["红包", Sparkles],
  ["其他收入", BadgePlus],
];

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
  const [selectedCategory, setSelectedCategory] = useState("午餐");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<LedgerTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [transactionDateFilter, setTransactionDateFilter] = useState<
    string | null
  >(null);
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const ledger = useLedger(Boolean(session?.user));

  const categories = kind === "income" ? incomeCategories : expenseCategories;
  const kindLabel =
    kind === "expense" ? "支出" : kind === "income" ? "收入" : "转账";
  const selectedIcon = (categories.find(
    ([name]) => name === selectedCategory,
  )?.[1] || Utensils) as typeof Utensils;
  const SelectedIcon = selectedIcon;

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
    setKind("expense");
    setSelectedCategory("午餐");
    setAmount("0");
    setNote("");
    setComposerOpen(true);
  }

  function openTransactionEditor(transaction: LedgerTransaction) {
    const transactionKind: TransactionKind =
      transaction.transactionType === "income"
        ? "income"
        : transaction.transactionType === "transfer"
          ? "transfer"
          : "expense";
    setEditingTransaction(transaction);
    setKind(transactionKind);
    setSelectedCategory(
      transaction.categoryName ||
        transaction.merchantName ||
        (transactionKind === "income" ? "工资薪水" : "午餐"),
    );
    setAmount((transaction.amountCents / 100).toFixed(2));
    setNote(transaction.note || "");
    setComposerOpen(true);
  }

  async function saveTransaction() {
    if (saving) return;
    const amountCents = Math.round(Number.parseFloat(amount || "0") * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setToast("请输入大于 0 的金额");
      return;
    }
    try {
      setSaving(true);
      if (editingTransaction) {
        await ledger.updateTransaction({
          id: editingTransaction.id,
          transactionType: kind,
          amountCents,
          categoryName: selectedCategory,
          note,
        });
      } else {
        await ledger.addTransaction({
          transactionType: kind,
          amountCents,
          categoryName: selectedCategory,
          note,
        });
      }
      setComposerOpen(false);
      setAmount("0");
      setNote("");
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
            totals={ledger.totals}
            transactionCount={ledger.transactions.length}
            transactions={ledger.transactions}
          />
        )}
        {view === "reports" && (
          <ReportsView transactions={ledger.transactions} />
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
        {view === "plans" && <PlansView />}
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
          setKind={setKind}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          amount={amount}
          note={note}
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
}: {
  onCompose: () => void;
  onEdit: (transaction: LedgerTransaction) => void;
  onImport: () => void;
  onSelectDay: (date: string) => void;
  onViewAll: () => void;
  totals: { income: number; expense: number; balance: number };
  transactionCount: number;
  transactions: LedgerTransaction[];
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
        <QuickAction icon={Clock3} label="周期账" color="#8366e8" />
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

function PlansView() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="card soft-shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold">八月预算</p>
            <p className="mt-1 text-sm text-[#8b94a3]">控制节奏，不控制生活</p>
          </div>
          <Settings2 size={19} className="text-[#7d8792]" />
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-sm text-[#8b94a3]">已使用</p>
            <p className="money mt-1 text-3xl font-bold">¥6,345.54</p>
          </div>
          <p className="text-right text-sm text-[#8b94a3]">
            总预算
            <br />
            <b className="money text-xl text-[#20252b]">¥10,000.00</b>
          </p>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#edf1f1]">
          <div className="h-full w-[63.5%] rounded-full bg-[#28c5b4]" />
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-[#28a99d]">仍有 ¥3,654.46 可用</span>
          <span className="text-[#8b94a3]">63.45%</span>
        </div>
      </section>
      <section className="card p-6">
        <p className="font-bold">本月提醒</p>
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#fff0eb] text-[#ff714b]">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">房租将在 3 天后生成</p>
              <p className="text-xs text-[#8b94a3]">每月 1 日 · ¥3,500.00</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#e8f6f4] text-[#0c6f78]">
              <Target size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">旅行基金已完成 62%</p>
              <p className="text-xs text-[#8b94a3]">目标 ¥12,000.00</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Composer({
  kind,
  setKind,
  selectedCategory,
  setSelectedCategory,
  categories,
  amount,
  note,
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
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: (string | typeof Coffee)[][];
  amount: string;
  note: string;
  editing: boolean;
  saving: boolean;
  inputNumber: (value: string) => void;
  onAmountChange: (value: string) => void;
  setNote: (note: string) => void;
  onClose: () => void;
  onSave: () => void;
  SelectedIcon: typeof Utensils;
}) {
  const tabs: [TransactionKind, string, typeof ArrowDownLeft][] = [
    ["expense", "支出", ArrowUpRight],
    ["income", "收入", ArrowDownLeft],
    ["transfer", "转账", ArrowLeftRight],
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
                  setSelectedCategory(id === "income" ? "工资薪水" : "午餐");
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
          <span className="grid size-11 place-items-center rounded-2xl bg-[#e4f7f4] text-[#28b9aa]">
            <SelectedIcon size={23} />
          </span>
          <b className="text-lg">{selectedCategory}</b>
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
            {categories.map(([name, Icon]) => {
              const CategoryIcon = Icon as typeof Coffee;
              const selected = name === selectedCategory;
              return (
                <button
                  onClick={() => setSelectedCategory(name as string)}
                  disabled={saving}
                  className="grid place-items-center gap-2 text-center text-sm text-[#4e5863]"
                  key={name as string}
                >
                  <span
                    className={`grid size-11 place-items-center rounded-2xl ${selected ? "bg-[#28c5b4] text-white shadow-[0_8px_16px_rgba(40,197,180,.28)]" : "bg-[#e9edef] text-[#9aa4b1]"}`}
                  >
                    <CategoryIcon size={21} />
                  </span>
                  <span className={selected ? "font-bold text-[#20252b]" : ""}>
                    {name as string}
                  </span>
                </button>
              );
            })}
          </div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving}
            className="mt-10 w-full bg-transparent text-base outline-none placeholder:text-[#a7b0bb]"
            placeholder="输入备注…"
          />
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {["今天 13:00", "支付宝", "自己", "商家", "标签"].map(
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

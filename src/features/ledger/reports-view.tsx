"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, CircleDollarSign, ListFilter, LoaderCircle, TrendingDown, TrendingUp, WalletCards, X } from "lucide-react";
import { useLedgerReport } from "@/features/ledger/use-ledger-report";
import { useLedgerTransactions } from "@/features/ledger/use-ledger-transactions";
import type { CategoryReportItem, LedgerReportScope, ReportBucket, ReportDetailFilter, ReportScopeType, ReportTransaction } from "@/features/ledger/report-types";

const incomeColor = "#ff714b";
const expenseColor = "#28c5b4";
const balanceColor = "#5579de";

type Tab = "trend" | "major" | "minor";

function money(cents: number) {
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

function localMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function localYear() { return localMonth().slice(0, 4); }

function scopeTitle(scope: LedgerReportScope) {
  if (scope.type === "month") return `${scope.date!.slice(0, 4)}年${Number(scope.date!.slice(5))}月`;
  if (scope.type === "year") return `${scope.date}年`;
  return "全部时间";
}

function rangeTitle(bucket: ReportBucket) { return bucket.label; }

function iconText(item: CategoryReportItem) { return item.icon === "wallet" ? "￥" : item.name.slice(0, 1); }

function categoryFilter(scopeTitleText: string, reportStart: string, reportEnd: string, type: "income" | "expense", level: "major" | "minor", item: CategoryReportItem): ReportDetailFilter {
  return { title: `${scopeTitleText} · ${item.name}`, startAt: reportStart, endAt: reportEnd, types: [type], categoryLevel: level, categoryId: item.id ?? undefined };
}

export function ReportsView({ enabled, onEdit }: { enabled: boolean; onEdit: (transaction: ReportTransaction) => void }) {
  const [scopeType, setScopeType] = useState<ReportScopeType>("month");
  const [month, setMonth] = useState(localMonth);
  const [year, setYear] = useState(localYear);
  const [tab, setTab] = useState<Tab>("trend");
  const [detail, setDetail] = useState<ReportDetailFilter | null>(null);
  const scope = useMemo<LedgerReportScope>(() => scopeType === "month" ? { type: "month", date: month } : scopeType === "year" ? { type: "year", date: year } : { type: "all" }, [month, scopeType, year]);
  const { data, loading, error } = useLedgerReport(enabled, scope);

  function move(offset: number) {
    if (scopeType === "month") {
      const [currentYear, currentMonth] = month.split("-").map(Number);
      const next = new Date(Date.UTC(currentYear, currentMonth - 1 + offset, 1));
      setMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    if (scopeType === "year") setYear(String(Number(year) + offset));
  }

  return <div className="space-y-5">
    <section className="card soft-shadow flex flex-wrap items-center gap-3 p-3 md:p-4">
      <div className="flex rounded-xl bg-[#e8eeee] p-1 text-sm">
        {(["month", "year", "all"] as const).map((item) => <button key={item} onClick={() => setScopeType(item)} className={`rounded-lg px-4 py-2 font-medium transition ${scopeType === item ? "bg-white text-[#ff714b] shadow-sm" : "text-[#66717d] hover:text-[#34404b]"}`}>{item === "month" ? "月" : item === "year" ? "年" : "全部"}</button>)}
      </div>
      {scopeType !== "all" && <div className="flex items-center overflow-hidden rounded-xl border border-[#edf0f0] bg-white text-sm">
        <button onClick={() => move(-1)} aria-label="上一个时间范围" className="grid size-10 place-items-center text-[#65717d] hover:bg-[#f5f7f7]"><ChevronLeft size={17} /></button>
        <span className="min-w-28 text-center font-semibold">{scopeTitle(scope)}</span>
        <button onClick={() => move(1)} aria-label="下一个时间范围" className="grid size-10 place-items-center text-[#65717d] hover:bg-[#f5f7f7]"><ChevronRight size={17} /></button>
      </div>}
      {scopeType === "all" && <span className="rounded-xl bg-[#f1f7f6] px-4 py-2 text-sm font-medium text-[#16766b]">从首笔流水到现在</span>}
      <span className="ml-auto text-sm text-[#8b94a3]">真实流水统计 · 不受 300 笔限制</span>
    </section>
    <section className="flex overflow-x-auto rounded-xl bg-[#e8eeee] p-1 text-sm">
      {([ ["trend", "趋势", TrendingUp], ["major", "大类", CircleDollarSign], ["minor", "小类", ListFilter] ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex min-w-28 items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition ${tab === id ? "bg-white text-[#20252b] shadow-sm" : "text-[#71808b]"}`}><Icon size={16} />{label}</button>)}
    </section>
    {loading && !data ? <LoadingState /> : error ? <section className="card p-10 text-center text-[#d95d3d]">{error}</section> : !data ? null : <>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label={`${scopeTitle(scope)}收入`} cents={data.summary.incomeCents} color={incomeColor} />
        <Metric label={`${scopeTitle(scope)}支出`} cents={data.summary.expenseCents} color={expenseColor} />
        <Metric label={`${scopeTitle(scope)}结余`} cents={data.summary.balanceCents} color={data.summary.balanceCents >= 0 ? balanceColor : "#d95d3d"} />
      </section>
      {tab === "trend" && <TrendPanel buckets={data.trends} scope={scope} onDetail={setDetail} />}
      {tab === "major" && <CategoryPanel level="major" scopeTitleText={scopeTitle(scope)} startAt={data.range.startAt} endAt={data.range.endAt} expense={data.categories.major.expense} income={data.categories.major.income} onDetail={setDetail} />}
      {tab === "minor" && <CategoryPanel level="minor" scopeTitleText={scopeTitle(scope)} startAt={data.range.startAt} endAt={data.range.endAt} expense={data.categories.minor.expense} income={data.categories.minor.income} onDetail={setDetail} />}
    </>}
    <ReportDetailDrawer filter={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
  </div>;
}

function LoadingState() { return <section className="card flex min-h-72 items-center justify-center gap-3 text-[#71808b]"><LoaderCircle className="animate-spin" size={22} />正在汇总全部流水…</section>; }

function Metric({ label, cents, color }: { label: string; cents: number; color: string }) {
  return <section className="card p-5"><p className="text-sm text-[#7d8792]">{label}</p><p className="money mt-2 text-2xl font-bold" style={{ color }}>¥{money(cents)}</p></section>;
}

function TrendPanel({ buckets, scope, onDetail }: { buckets: ReportBucket[]; scope: LedgerReportScope; onDetail: (filter: ReportDetailFilter) => void }) {
  return <section className="grid gap-5 xl:grid-cols-3">
    <TrendCard title="收入趋势" color={incomeColor} type="income" buckets={buckets} scope={scope} onDetail={onDetail} />
    <TrendCard title="支出趋势" color={expenseColor} type="expense" buckets={buckets} scope={scope} onDetail={onDetail} />
    <TrendCard title="结余趋势" color={balanceColor} type="balance" buckets={buckets} scope={scope} onDetail={onDetail} />
  </section>;
}

function TrendCard({ title, color, type, buckets, scope, onDetail }: { title: string; color: string; type: "income" | "expense" | "balance"; buckets: ReportBucket[]; scope: LedgerReportScope; onDetail: (filter: ReportDetailFilter) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rows = [...buckets].filter((bucket) => type === "income" ? bucket.incomeCents > 0 : type === "expense" ? bucket.expenseCents > 0 : bucket.incomeCents > 0 || bucket.expenseCents > 0).reverse();
  const visibleRows = expanded ? rows : rows.slice(0, 3);
  const values = buckets.map((bucket) => type === "income" ? bucket.incomeCents : type === "expense" ? bucket.expenseCents : bucket.balanceCents);
  const amount = values.reduce((sum, value) => sum + value, 0);
  const count = buckets.reduce((sum, bucket) => sum + (type === "income" ? bucket.incomeCount : type === "expense" ? bucket.expenseCount : bucket.incomeCount + bucket.expenseCount), 0);
  const open = (bucket: ReportBucket) => onDetail({ title: `${rangeTitle(bucket)}${type === "income" ? "收入" : type === "expense" ? "支出" : "流水"}`, startAt: bucket.startAt, endAt: bucket.endAt, types: type === "balance" ? ["income", "expense"] : [type] });
  return <section className="card soft-shadow overflow-hidden p-5">
    <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-[#929ba4]">{scope.type === "month" ? "按日" : scope.type === "year" ? "按月" : "按年"}查看</p></div>{type === "expense" ? <TrendingDown size={20} style={{ color }} /> : <TrendingUp size={20} style={{ color }} />}</div>
    <TrendChart values={values} color={color} buckets={buckets} onClickIndex={(index) => buckets[index] && open(buckets[index])} />
    <div className="mt-3 rounded-xl bg-[#f5f7f7] px-3 py-2.5 text-sm text-[#65717d]">{count ? `${count} 笔 · 合计 ¥${money(amount)}` : "当前范围暂无流水"}</div>
    <div className="mt-2 divide-y divide-[#edf0f0]">{visibleRows.map((bucket) => { const cents = type === "income" ? bucket.incomeCents : type === "expense" ? bucket.expenseCents : bucket.balanceCents; const itemCount = type === "income" ? bucket.incomeCount : type === "expense" ? bucket.expenseCount : bucket.incomeCount + bucket.expenseCount; return <button key={bucket.key} onClick={() => open(bucket)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#f8fbfb]"><span className="grid size-9 place-items-center rounded-full text-xs font-bold" style={{ color, background: `${color}16` }}>{bucket.label.replace(/^\d{4}年/, "")}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{bucket.label}</b><small className="text-[#929ba4]">{itemCount} 笔</small></span><b className="money text-base" style={{ color: type === "balance" && cents < 0 ? "#d95d3d" : undefined }}>{cents < 0 ? "-" : ""}¥{money(Math.abs(cents))}</b></button>; })}</div>
    {rows.length > 3 && <button onClick={() => setExpanded((value) => !value)} className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-[#16766b] hover:bg-[#f1f8f7]">{expanded ? "收起" : `查看全部 ${rows.length} 个时间段`}</button>}
  </section>;
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const next = points[index + 1] ?? point;
    const controlOneX = previous.x + (point.x - (points[index - 2]?.x ?? previous.x)) / 6;
    const controlOneY = previous.y + (point.y - (points[index - 2]?.y ?? previous.y)) / 6;
    const controlTwoX = point.x - (next.x - previous.x) / 6;
    const controlTwoY = point.y - (next.y - previous.y) / 6;
    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point.x} ${point.y}`;
  }, "");
}

function TrendChart({ values, color, buckets, onClickIndex }: { values: number[]; color: string; buckets: ReportBucket[]; onClickIndex: (index: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(values.findLastIndex((value) => value !== 0), values.length - 1, 0));
  if (!values.length) return <div className="grid h-52 place-items-center text-sm text-[#98a1aa]">暂无趋势数据</div>;
  const width = 344; const height = 202; const left = 12; const right = 12; const top = 20; const bottom = 164;
  const min = Math.min(...values, 0); const max = Math.max(...values, 0); const hasNegative = min < 0;
  const magnitude = hasNegative ? Math.max(Math.abs(min), Math.abs(max), 1) : Math.max(max, 1);
  const zeroY = hasNegative ? (top + bottom) / 2 : bottom;
  const yFor = (value: number) => hasNegative ? zeroY - (value / magnitude) * 64 : bottom - (value / magnitude) * (bottom - top - 8);
  const points = values.map((value, index) => ({ x: left + (index / Math.max(values.length - 1, 1)) * (width - left - right), y: yFor(value) }));
  const line = smoothPath(points); const area = `${line} L ${points.at(-1)!.x} ${zeroY} L ${points[0].x} ${zeroY} Z`;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const averageY = yFor(average); const active = points[activeIndex] ?? points.at(-1)!; const bucket = buckets[activeIndex];
  const gradientId = `trend-fill-${color.replace("#", "")}`;
  const tickIndexes = [...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1])];
  const tickLabel = (index: number) => { const label = buckets[index]?.label ?? ""; return label.replace(/^\d{4}年/, "").replace(/日$/, ""); };
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible" role="img" aria-label="点击趋势点查看流水">
    <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.34" /><stop offset="100%" stopColor={color} stopOpacity="0.025" /></linearGradient></defs>
    {[0.2, 0.4, 0.6, 0.8].map((ratio) => <line key={ratio} x1={left} x2={width - right} y1={top + (bottom - top) * ratio} y2={top + (bottom - top) * ratio} stroke="#e8eeee" strokeDasharray="3 5" />)}
    <line x1={left} x2={width - right} y1={averageY} y2={averageY} stroke={color} strokeOpacity="0.38" strokeDasharray="5 5" />
    <text x={width - right - 1} y={averageY - 6} textAnchor="end" fill="#8d98a2" fontSize="10">均值 ¥{money(Math.round(average))}</text>
    <path d={area} fill={`url(#${gradientId})`} /><path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <line x1={active.x} x2={active.x} y1={top} y2={bottom} stroke="#cfd8da" strokeWidth="1" />
    <circle cx={active.x} cy={active.y} r="5.5" fill="white" stroke={color} strokeWidth="3" />
    {bucket && <g transform={`translate(${Math.min(Math.max(active.x - 47, 5), width - 99)} 1)`}><rect width="94" height="37" rx="7" fill="#f3f6f6" /><text x="47" y="15" textAnchor="middle" fill="#7f8b96" fontSize="10">{bucket.label}</text><text x="47" y="29" textAnchor="middle" fill="#28323a" fontSize="11" fontWeight="700">¥{money(values[activeIndex] ?? 0)}</text></g>}
    {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="12" fill="transparent" className="cursor-pointer" onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => { setActiveIndex(index); onClickIndex(index); }}><title>{buckets[index]?.label}，查看明细</title></circle>)}
    <line x1={left} x2={width - right} y1={bottom} y2={bottom} stroke="#e2e9e9" />
    {tickIndexes.map((index) => <text key={index} x={points[index].x} y="187" textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"} fill="#98a1aa" fontSize="10">{tickLabel(index)}</text>)}
  </svg>;
}

function CategoryPanel({ level, scopeTitleText, startAt, endAt, expense, income, onDetail }: { level: "major" | "minor"; scopeTitleText: string; startAt: string | null; endAt: string | null; expense: CategoryReportItem[]; income: CategoryReportItem[]; onDetail: (filter: ReportDetailFilter) => void }) {
  if (!startAt || !endAt) return <EmptyReport />;
  return <div className="space-y-5">
    <section className="grid gap-5 xl:grid-cols-2"><CategoryCard title={`${level === "major" ? "大类" : "小类"}支出`} color={expenseColor} type="expense" level={level} items={expense} scopeTitleText={scopeTitleText} startAt={startAt} endAt={endAt} onDetail={onDetail} /><CategoryCard title={`${level === "major" ? "大类" : "小类"}收入`} color={incomeColor} type="income" level={level} items={income} scopeTitleText={scopeTitleText} startAt={startAt} endAt={endAt} onDetail={onDetail} /></section>
    <FlowCard level={level} expense={expense} income={income} scopeTitleText={scopeTitleText} startAt={startAt} endAt={endAt} onDetail={onDetail} />
  </div>;
}

function EmptyReport() { return <section className="card grid min-h-64 place-items-center p-8 text-center text-[#8b94a3]"><div><BarChart3 className="mx-auto mb-3 text-[#a5b1b5]" /><p>当前范围暂无收入或支出流水</p></div></section>; }

const expensePalette = ["#2fc7b4", "#2fb4e6", "#5c86ed", "#7168ec", "#ff9e2d", "#f8c132", "#43ba75", "#44cf91", "#5f85d8", "#b17de5"];
const incomePalette = ["#ff5e71", "#ff714b", "#ff9146", "#ffb72d", "#f56fa8", "#e27be6", "#f48b70", "#f5bf56"];
function visualColor(item: CategoryReportItem, index: number, type: "income" | "expense") { return (type === "income" ? incomePalette : expensePalette)[index % (type === "income" ? incomePalette : expensePalette).length] ?? item.color; }

function CategoryCard({ title, color, type, level, items, scopeTitleText, startAt, endAt, onDetail }: { title: string; color: string; type: "income" | "expense"; level: "major" | "minor"; items: CategoryReportItem[]; scopeTitleText: string; startAt: string; endAt: string; onDetail: (filter: ReportDetailFilter) => void }) {
  const [expanded, setExpanded] = useState(false); const visible = expanded ? items : items.slice(0, 3); const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const open = (item: CategoryReportItem) => onDetail(categoryFilter(scopeTitleText, startAt, endAt, type, level, item));
  return <section className="card soft-shadow p-5"><div className="mb-2 flex items-start justify-between"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-[#8b94a3]">点击图表或分类查看流水</p></div><span className="money text-lg font-bold" style={{ color }}>¥{money(total)}</span></div>{items.length ? <><Donut items={items} type={type} color={color} onPick={open} /><div className="divide-y divide-[#edf0f0]">{visible.map((item, index) => { const segmentColor = visualColor(item, index, type); return <button key={item.id} onClick={() => open(item)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#f8fbfb]"><span className="grid size-10 place-items-center rounded-full text-sm font-bold" style={{ background: `${color}18`, color }}>{iconText(item)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.name}</b><small className="text-[#929ba4]">{item.transactionCount} 笔</small><span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#edf2f2]"><span className="block h-full rounded-full" style={{ width: `${Math.max(item.percentage, 2)}%`, background: segmentColor }} /></span></span><span className="text-right"><b className="money block">¥{money(item.amountCents)}</b><small className="text-[#929ba4]">{item.percentage.toFixed(2)}%</small></span></button>; })}</div>{items.length > 3 && <button onClick={() => setExpanded((value) => !value)} className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-[#16766b] hover:bg-[#f1f8f7]">{expanded ? "收起" : `点击展开 ${items.length} 个分类`}</button>}</> : <p className="rounded-xl bg-[#f5f7f7] py-10 text-center text-sm text-[#98a1aa]">暂无对应分类流水</p>}</section>;
}

function Donut({ items, type, color, onPick }: { items: CategoryReportItem[]; type: "income" | "expense"; color: string; onPick: (item: CategoryReportItem) => void }) {
  const [hovered, setHovered] = useState<CategoryReportItem | null>(null); const topLabels = items.slice(0, 6); const circumference = 2 * Math.PI * 66; let offset = 0; const display = hovered ?? items[0];
  return <div className="relative mx-auto mb-3 w-full max-w-[360px]"><svg viewBox="0 0 340 268" className="w-full overflow-visible" role="img" aria-label="点击分类扇区查看流水">{items.map((item, index) => { const length = Math.max((item.percentage / 100) * circumference - 1.2, 0); const circle = <circle key={item.id} cx="170" cy="125" r="66" fill="none" stroke={visualColor(item, index, type)} strokeWidth="23" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 170 125)" className="cursor-pointer transition-opacity hover:opacity-75" onClick={() => onPick(item)} onMouseEnter={() => setHovered(item)} onMouseLeave={() => setHovered(null)} />; offset += (item.percentage / 100) * circumference; return circle; })}<circle cx="170" cy="125" r="50" fill="white" /><text x="170" y="117" textAnchor="middle" fill="#8a96a0" fontSize="12">总{type === "income" ? "收入" : "支出"}</text><text x="170" y="140" textAnchor="middle" fill="#20252b" fontSize="18" fontWeight="700">¥{money(display.amountCents)}</text>{topLabels.map((item, index) => { const before = items.slice(0, index).reduce((sum, value) => sum + value.percentage, 0); const angle = ((before + item.percentage / 2) / 100) * Math.PI * 2 - Math.PI / 2; const isRight = Math.cos(angle) >= 0; const x1 = 170 + Math.cos(angle) * 79; const y1 = 125 + Math.sin(angle) * 79; const x2 = 170 + Math.cos(angle) * 93; const y2 = 125 + Math.sin(angle) * 93; const x3 = isRight ? 326 : 14; return <g key={`label-${item.id}`} className="cursor-pointer" onClick={() => onPick(item)}><path d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y2}`} fill="none" stroke={visualColor(item, index, type)} strokeOpacity=".65" strokeWidth="1" /><text x={isRight ? x3 - 3 : x3 + 3} y={y2 - 3} textAnchor={isRight ? "end" : "start"} fill="#63707c" fontSize="10.5">{item.name} {item.percentage.toFixed(2)}%</text></g>; })}</svg></div>;
}

function FlowCard({ level, expense, income, scopeTitleText, startAt, endAt, onDetail }: { level: "major" | "minor"; expense: CategoryReportItem[]; income: CategoryReportItem[]; scopeTitleText: string; startAt: string; endAt: string; onDetail: (filter: ReportDetailFilter) => void }) {
  const incomeRows = income.slice(0, 8); const expenseRows = expense.slice(0, 8); const open = (item: CategoryReportItem, type: "income" | "expense") => onDetail(categoryFilter(scopeTitleText, startAt, endAt, type, level, item));
  const incomeTotal = income.reduce((sum, item) => sum + item.amountCents, 0); const expenseTotal = expense.reduce((sum, item) => sum + item.amountCents, 0);
  return <section className="card soft-shadow overflow-hidden p-5"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold">{level === "major" ? "大类" : "小类"}流向</h2><p className="mt-1 text-sm text-[#8b94a3]">收支结构对照，点击分类可查看明细</p></div><span className="rounded-full bg-[#fff0ea] px-3 py-1 text-xs font-semibold text-[#ff714b]">结构流向</span></div><div className="grid grid-cols-2 gap-5 text-sm"><div className="font-semibold text-[#ff714b]">收入 <span className="money ml-1">¥{money(incomeTotal)}</span></div><div className="text-right font-semibold text-[#28a99d]">支出 <span className="money ml-1">¥{money(expenseTotal)}</span></div></div><div className="relative mt-3 grid grid-cols-[1fr_18px_1fr] gap-0"><div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[#dfe8e8]" /><FlowColumn title="收入分类" color={incomeColor} items={incomeRows} onPick={(item) => open(item, "income")} align="left" /><div className="relative z-10" /> <FlowColumn title="支出分类" color={expenseColor} items={expenseRows} onPick={(item) => open(item, "expense")} align="right" /></div></section>;
}

function FlowColumn({ title, color, items, onPick, align }: { title: string; color: string; items: CategoryReportItem[]; onPick: (item: CategoryReportItem) => void; align: "left" | "right" }) { const max = Math.max(...items.map((item) => item.amountCents), 1); const left = align === "left"; return <div className={left ? "pr-1" : "pl-1"}><p className={`mb-2 text-xs text-[#929ba4] ${left ? "text-right" : "text-left"}`}>{title}</p>{items.length ? <div className="space-y-2.5">{items.map((item, index) => { const width = Math.max((item.amountCents / max) * 100, 8); return <button key={item.id} onClick={() => onPick(item)} className={`relative flex w-full flex-col ${left ? "items-end text-right" : "items-start text-left"}`}><span className="max-w-full truncate text-sm font-medium">{item.name}</span><span className="money text-xs" style={{ color }}>¥{money(item.amountCents)}</span><span className="mt-1 flex h-2 w-full items-center bg-[#edf2f2]" style={{ borderRadius: left ? "999px 0 0 999px" : "0 999px 999px 0" }}><span className="h-2" style={{ width: `${width}%`, background: visualColor(item, index, left ? "income" : "expense"), borderRadius: left ? "999px 0 0 999px" : "0 999px 999px 0", marginLeft: left ? "auto" : 0 }} /></span></button>; })}</div> : <p className="rounded-xl bg-[#f5f7f7] p-6 text-center text-sm text-[#98a1aa]">暂无数据</p>}</div>; }

function ReportDetailDrawer({ filter, onClose, onEdit }: { filter: ReportDetailFilter | null; onClose: () => void; onEdit: (transaction: ReportTransaction) => void }) {
  const { items, loading, error, hasMore, loadMore } = useLedgerTransactions(filter);
  if (!filter) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#172026]/35 p-0 sm:p-4"><section className="flex h-full w-full max-w-xl flex-col bg-[#f5f8f8] shadow-2xl sm:rounded-3xl"><header className="flex items-center justify-between border-b border-[#e6ecec] bg-white px-5 py-4"><div><h2 className="font-bold">{filter.title}</h2><p className="mt-1 text-xs text-[#8b94a3]">{filter.types.length === 2 ? "收入与支出明细" : filter.types[0] === "income" ? "收入明细" : "支出明细"}</p></div><button onClick={onClose} aria-label="关闭明细" className="grid size-10 place-items-center rounded-full text-[#63707c] hover:bg-[#f2f5f5]"><X /></button></header><div className="flex-1 overflow-y-auto p-4">{loading && !items.length ? <LoadingState /> : error ? <p className="p-8 text-center text-[#d95d3d]">{error}</p> : items.length ? <div className="space-y-2">{items.map((item) => <button key={item.id} onClick={() => onEdit(item)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"><span className="grid size-10 place-items-center rounded-full text-sm font-bold" style={{ color: item.categoryColor ?? (item.transactionType === "income" ? incomeColor : expenseColor), background: `${item.categoryColor ?? (item.transactionType === "income" ? incomeColor : expenseColor)}18` }}>{(item.categoryName ?? "未").slice(0, 1)}</span><span className="min-w-0 flex-1"><b className="block truncate">{item.categoryName ?? item.merchantName ?? "未分类"}</b><small className="block truncate text-[#8b94a3]">{item.note || new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.occurredAt))}</small></span><b className="money text-lg" style={{ color: item.transactionType === "income" ? incomeColor : expenseColor }}>{item.transactionType === "income" ? "+" : "-"}¥{money(item.amountCents)}</b></button>)}</div> : <p className="p-10 text-center text-[#8b94a3]">没有符合条件的流水</p>}{hasMore && <button disabled={loading} onClick={loadMore} className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-medium text-[#16766b] shadow-sm disabled:opacity-60">{loading ? "加载中…" : "加载更多"}</button>}</div></section></div>;
}

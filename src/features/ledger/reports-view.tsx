"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, CircleDollarSign, ListFilter, LoaderCircle, TrendingDown, TrendingUp, WalletCards, X } from "lucide-react";
import ReactECharts from "echarts-for-react";
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

function TrendChart({ values, color, buckets, onClickIndex }: { values: number[]; color: string; buckets: ReportBucket[]; onClickIndex: (index: number) => void }) {
  if (!values.length) return <div className="grid h-52 place-items-center text-sm text-[#98a1aa]">暂无趋势数据</div>;
  const labels = buckets.map((bucket) => bucket.label.replace(/^\d{4}年/, ""));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const option = {
    animationDuration: 350,
    grid: { left: 8, right: 12, top: 28, bottom: 24, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: labels, axisLine: { lineStyle: { color: "#e2e9e9" } }, axisTick: { show: false }, axisLabel: { color: "#98a1aa", fontSize: 10, interval: "auto" } },
    yAxis: { type: "value", scale: true, splitNumber: 4, axisLabel: { color: "#98a1aa", fontSize: 10, formatter: (value: number) => `¥${Math.round(value)}` }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: "#e8eeee", type: "dashed" } } },
    tooltip: { trigger: "axis", confine: true, enterable: false, transitionDuration: 0.15, backgroundColor: "#f3f6f6", borderColor: "transparent", borderWidth: 0, borderRadius: 9, padding: [9, 13], shadowBlur: 18, shadowColor: "rgba(35, 57, 62, 0.12)", textStyle: { color: "#20252b", fontSize: 12 }, axisPointer: { type: "line", snap: true, lineStyle: { color: "#cfd8da", width: 1 } }, formatter: (params: { dataIndex: number; axisValue: string; value: number }[]) => { const point = params[0]; return `<div style="font-size:12px;line-height:18px;color:#7f8b96">${buckets[point.dataIndex]?.label ?? point.axisValue}</div><div style="font-size:15px;line-height:22px;font-weight:700;color:#20252b">¥${money(Number(point.value))}</div><div style="margin-top:2px;font-size:11px;line-height:16px;color:#8b94a3">点击查看该时间段明细</div>`; } },
    series: [{ type: "line", data: values, smooth: 0.35, symbol: "circle", symbolSize: 7, showSymbol: values.length <= 31, lineStyle: { color, width: 3 }, itemStyle: { color, borderColor: "#fff", borderWidth: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${color}55` }, { offset: 1, color: `${color}05` }] } }, markLine: { silent: true, symbol: "none", lineStyle: { color: `${color}66`, type: "dashed" }, label: { color: "#8d98a2", fontSize: 10, formatter: `均值 ¥${money(Math.round(average))}`, position: "insideEndTop" }, data: [{ yAxis: average }] } }],
  };
  return <ReactECharts option={option} style={{ height: 208, width: "100%" }} opts={{ renderer: "canvas" }} onEvents={{ click: (params: { dataIndex: number }) => onClickIndex(params.dataIndex) }} />;
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
  const data = items.map((item, index) => ({ name: item.name, value: item.amountCents, item, itemStyle: { color: visualColor(item, index, type) } }));
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const option = {
    animationDuration: 350,
    tooltip: { trigger: "item", confine: true, backgroundColor: "#f3f6f6", borderColor: "transparent", borderWidth: 0, borderRadius: 9, padding: [9, 13], shadowBlur: 18, shadowColor: "rgba(35, 57, 62, 0.12)", textStyle: { color: "#20252b", fontSize: 12 }, formatter: (params: { name: string; value: number; percent: number }) => `<strong>${params.name}</strong><br/>¥${money(params.value)} · ${params.percent.toFixed(2)}%` },
    series: [{ type: "pie", radius: ["42%", "68%"], center: ["50%", "50%"], avoidLabelOverlap: false, minAngle: 1, itemStyle: { borderColor: "#fff", borderWidth: 2 }, label: { show: true, color: "#63707c", fontSize: 10, formatter: (params: { name: string; percent: number }) => `${params.name} ${params.percent.toFixed(2)}%`, lineHeight: 14, overflow: "break" }, labelLine: { show: true, length: 14, length2: 18, smooth: false, lineStyle: { width: 1 } }, labelLayout: { hideOverlap: false, moveOverlap: "shiftY", draggable: false }, emphasis: { scale: true, scaleSize: 4, label: { show: true, fontWeight: 700 } }, data }],
    graphic: [{ type: "text", left: "center", top: "42%", style: { text: `总${type === "income" ? "收入" : "支出"}`, fill: "#8a96a0", fontSize: 12, textAlign: "center" } }, { type: "text", left: "center", top: "51%", style: { text: `¥${money(total)}`, fill: "#20252b", fontSize: 18, fontWeight: 700, textAlign: "center" } }],
  };
  return <ReactECharts option={option} style={{ height: Math.max(320, Math.min(440, 280 + items.length * 7)), width: "100%" }} opts={{ renderer: "canvas" }} onEvents={{ click: (params: { dataIndex: number }) => { const item = items[params.dataIndex]; if (item) onPick(item); } }} />;
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

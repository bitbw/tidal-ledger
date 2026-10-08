"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

const ROW_HEIGHT = 40;
const MIN_YEAR = 1970;

type DateParts = { year: number; month: number; day: number; hour: number; minute: number };

function currentParts(): DateParts {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() };
}

function parseValue(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return currentParts();
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const maxDay = new Date(year, month, 0).getDate();
  return { year, month, day: Math.min(Math.max(day, 1), maxDay), hour: Math.min(hour, 23), minute: Math.min(minute, 59) };
}

function formatValue({ year, month, day, hour, minute }: DateParts) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function WheelColumn({ label, values, selected, onSelect }: { label: string; values: number[]; selected: number; onSelect: (value: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTo = (index: number) => ref.current?.scrollTo({ top: index * ROW_HEIGHT, behavior: "smooth" });
  useLayoutEffect(() => { ref.current?.scrollTo({ top: values.indexOf(selected) * ROW_HEIGHT }); }, []);

  return <div className="relative min-w-0 flex-1">
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={(event) => onSelect(values[Math.min(values.length - 1, Math.max(0, Math.round(event.currentTarget.scrollTop / ROW_HEIGHT)))])}
      onKeyDown={(event) => {
        const index = values.indexOf(selected);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          scrollTo(Math.min(values.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1))));
        }
      }}
      className="h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-[80px] text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollPaddingBlock: ROW_HEIGHT * 2 }}
    >
      {values.map((value) => <div
        key={value}
        role="option"
        aria-selected={selected === value}
        onClick={() => { onSelect(value); scrollTo(values.indexOf(value)); }}
        className={`flex h-10 snap-center cursor-pointer items-center justify-center text-[15px] tabular-nums transition-colors ${selected === value ? "font-medium text-[#27343a]" : "text-[#aab2b6]"}`}
      >{label === "年份" ? value : String(value).padStart(2, "0")}</div>)}
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-10 border-y border-[#e8edef]" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent via-[22%] to-white opacity-70" />
  </div>;
}

export function WheelDateTimePicker({ value, onChange, disabled = false, className = "" }: { value: string; onChange: (value: string) => void; disabled?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateParts>(() => parseValue(value));
  const dayRef = useRef<HTMLDivElement>(null);
  const dayCount = daysInMonth(draft.year, draft.month);
  const maxYear = Math.max(new Date().getFullYear() + 1, draft.year);
  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index);

  useLayoutEffect(() => {
    if (open) dayRef.current?.scrollTo({ top: (draft.day - 1) * ROW_HEIGHT });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open || !dayRef.current) return;
    const maxScroll = Math.max(0, (dayCount - 1) * ROW_HEIGHT);
    if (dayRef.current.scrollTop > maxScroll) dayRef.current.scrollTo({ top: maxScroll });
  }, [dayCount, open]);

  const update = (patch: Partial<DateParts>) => setDraft((current) => {
    const next = { ...current, ...patch };
    next.day = Math.min(next.day, daysInMonth(next.year, next.month));
    return next;
  });
  const display = value ? value.replace("T", " ").replace(/-/g, "/") : "选择日期和时间";

  return <>
    <button type="button" disabled={disabled} onClick={() => { setDraft(parseValue(value)); setOpen(true); }} className={`flex min-w-0 items-center text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`} aria-label={`选择日期和时间，当前为 ${display}`}>
      <CalendarDays size={16} className="mr-2 shrink-0 text-[#0c6f78]" />
      <span className="min-w-0 flex-1 truncate">{display}</span>
    </button>
    {open && <div className="fixed inset-0 z-[80] flex items-end bg-[#102124]/45 md:items-center md:justify-center md:p-5" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="日期时间选择" onClick={(event) => event.stopPropagation()} className="w-full overflow-hidden rounded-t-[22px] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:max-w-[520px] md:rounded-[22px]">
        <header className="grid h-14 grid-cols-3 items-center border-b border-[#edf0f0] px-4 text-sm">
          <button type="button" onClick={() => setOpen(false)} className="justify-self-start py-2 text-[#68737d]">取消</button>
          <h2 className="text-center text-base font-semibold text-[#303b44]">日期时间选择</h2>
          <button type="button" onClick={() => { onChange(formatValue(draft)); setOpen(false); }} className="justify-self-end py-2 font-semibold text-[#0c6f78]">确认</button>
        </header>
        <div className="grid grid-cols-[1.35fr_1fr_1fr_0.9fr_0.9fr] gap-1 px-2 pb-3 pt-2">
          <WheelColumn label="年份" values={years} selected={draft.year} onSelect={(year) => update({ year })} />
          <WheelColumn label="月份" values={Array.from({ length: 12 }, (_, index) => index + 1)} selected={draft.month} onSelect={(month) => update({ month })} />
          <div className="relative min-w-0 flex-1">
            <div ref={dayRef} role="listbox" aria-label="日期" tabIndex={0} onScroll={(event) => update({ day: Math.min(dayCount, Math.max(1, Math.round(event.currentTarget.scrollTop / ROW_HEIGHT) + 1)) })} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const day = Math.min(dayCount, Math.max(1, draft.day + (event.key === "ArrowDown" ? 1 : -1))); update({ day }); dayRef.current?.scrollTo({ top: (day - 1) * ROW_HEIGHT, behavior: "smooth" }); } }} className="h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-[80px] text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => <div key={day} role="option" aria-selected={draft.day === day} onClick={() => { update({ day }); dayRef.current?.scrollTo({ top: (day - 1) * ROW_HEIGHT, behavior: "smooth" }); }} className={`flex h-10 snap-center cursor-pointer items-center justify-center text-[15px] tabular-nums transition-colors ${draft.day === day ? "font-medium text-[#27343a]" : "text-[#aab2b6]"}`}>{String(day).padStart(2, "0")}</div>)}
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-10 border-y border-[#e8edef]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent via-[22%] to-white opacity-70" />
          </div>
          <WheelColumn label="小时" values={Array.from({ length: 24 }, (_, index) => index)} selected={draft.hour} onSelect={(hour) => update({ hour })} />
          <WheelColumn label="分钟" values={Array.from({ length: 60 }, (_, index) => index)} selected={draft.minute} onSelect={(minute) => update({ minute })} />
        </div>
      </section>
    </div>}
  </>;
}

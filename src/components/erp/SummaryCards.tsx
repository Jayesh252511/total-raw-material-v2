import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Package, Receipt, Wrench, Calendar, CalendarDays, ShoppingCart, Lock, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmtINR, fmtTons } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoneyHistoryDialog } from "@/components/erp/MoneyHistoryDialog";

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  hint?: string;
  onClick?: () => void;
};

function Sparkline({ tone }: { tone: string }) {
  const strokeColor = tone === 'success' ? '#10b981' : tone === 'warning' ? '#f59e0b' : tone === 'danger' ? '#f43f5e' : tone === 'info' ? '#38bdf8' : '#6366f1';
  const isDown = tone === 'danger';
  return (
    <svg className="w-14 h-6 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 60 25" fill="none">
      <path
        d={isDown ? "M 2 5 Q 15 10, 30 18 T 58 22" : "M 2 20 Q 15 15, 30 10 T 58 3"}
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Card({ s }: { s: Stat }) {
  const Icon = s.icon;
  const toneMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    info: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    danger: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  const glowMap = {
    primary: "glow-card-primary",
    success: "glow-card-success",
    warning: "glow-card-warning",
    info: "glow-card-info",
    danger: "glow-card-danger",
  };
  const Comp = s.onClick ? "button" : "div";
  return (
    <Comp
      onClick={s.onClick}
      className={cn(
        "group relative rounded-xl border bg-card/80 backdrop-blur-md p-3.5 sm:p-4 shadow-soft transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left w-full overflow-hidden",
        glowMap[s.tone ?? "primary"],
        s.onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
          <p className="mt-1.5 text-base sm:text-xl font-bold tracking-tight tabular-nums truncate">{s.value}</p>
          {s.hint && <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-0.5 truncate">{s.hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-110", toneMap[s.tone ?? "primary"])}>
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Metrics</span>
        <Sparkline tone={s.tone ?? 'primary'} />
      </div>
    </Comp>
  );
}





type Props = {
  totalMoney: number;
  sellMoney: number;
  sellWithoutGBNoGST: number;
  lockMoney: number;
  totalStock: number;
  todayExpense: number;
  yearExpense: number;
  todayTons: number;
  yearTons: number;
  todayMaint: number;
  yearMaint: number;
  yearRM: number;
};

export function SummaryCards(p: Props) {
  const [openTotal, setOpenTotal] = useState(false);
  const [openLock, setOpenLock] = useState(false);
  const stats: Stat[] = [
    { label: "Total Money", value: fmtINR(p.totalMoney), icon: Wallet, tone: "primary", hint: "Tap for history", onClick: () => setOpenTotal(true) },
    { label: "Sell Received", value: fmtINR(p.sellMoney), icon: ShoppingCart, tone: "success", hint: "Total payment received from sells" },
    { label: "Amt w/o GB (w/o GST)", value: fmtINR(p.sellWithoutGBNoGST), icon: Coins, tone: "success", hint: "Sell total without Gadi Bhada or GST" },
    { label: "Lock Amount", value: fmtINR(p.lockMoney), icon: Lock, tone: "warning", hint: "Add-only · tap for history", onClick: () => setOpenLock(true) },
    { label: "Total Stock", value: fmtTons(p.totalStock), icon: Package, tone: "info" },
    { label: "Yearly Raw Material", value: fmtINR(p.yearRM), icon: Package, tone: "info" },
    { label: "Today's Expense", value: fmtINR(p.todayExpense), icon: Receipt, tone: "warning", hint: "Material + Maint." },
    { label: "Yearly Expense", value: fmtINR(p.yearExpense), icon: TrendingDown, tone: "danger" },
    { label: "Today's Tons Used", value: fmtTons(p.todayTons), icon: Calendar, tone: "info" },
    { label: "Yearly Tons Used", value: fmtTons(p.yearTons), icon: CalendarDays, tone: "info" },
    { label: "Today's Maintenance", value: fmtINR(p.todayMaint), icon: Wrench, tone: "warning" },
    { label: "Yearly Maintenance", value: fmtINR(p.yearMaint), icon: TrendingUp, tone: "success" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((s) => <Card key={s.label} s={s} />)}
      </div>
      <MoneyHistoryDialog open={openTotal} onOpenChange={setOpenTotal} field="total_money" title="Total Money — History" />
      <MoneyHistoryDialog open={openLock} onOpenChange={setOpenLock} field="lock_money" title="Lock Amount — History" />
    </>
  );
}

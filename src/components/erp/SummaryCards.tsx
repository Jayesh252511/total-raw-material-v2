import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Package, Receipt, Wrench, Calendar, CalendarDays, ShoppingCart, Lock } from "lucide-react";
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

function Card({ s }: { s: Stat }) {
  const Icon = s.icon;
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/15",
    info: "text-info bg-info/10",
    danger: "text-destructive bg-destructive/10",
  };
  const Comp = s.onClick ? "button" : "div";
  return (
    <Comp
      onClick={s.onClick}
      className={cn(
        "group relative rounded-xl border bg-card p-3 sm:p-4 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5 text-left w-full",
        s.onClick && "cursor-pointer hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
          <p className="mt-1.5 text-base sm:text-xl font-semibold tracking-tight tabular-nums truncate">{s.value}</p>
          {s.hint && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{s.hint}</p>}
        </div>
        <div className={cn("flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg", toneMap[s.tone ?? "primary"])}>
          <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.2} />
        </div>
      </div>
    </Comp>
  );
}





type Props = {
  totalMoney: number;
  sellMoney: number;
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

import { TrendingUp, TrendingDown, Wallet, Package, Receipt, Wrench, Calendar, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmtINR, fmtTons } from "@/lib/format";
import { cn } from "@/lib/utils";

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  hint?: string;
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
  return (
    <div className="group relative rounded-xl border bg-card p-3 sm:p-4 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5">
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
    </div>
  );
}

type Props = {
  totalMoney: number;
  totalStock: number;
  todayExpense: number;
  monthExpense: number;
  todayTons: number;
  monthTons: number;
  todayMaint: number;
  monthMaint: number;
};

export function SummaryCards(p: Props) {
  const stats: Stat[] = [
    { label: "Total Money", value: fmtINR(p.totalMoney), icon: Wallet, tone: "primary" },
    { label: "Total Stock", value: fmtTons(p.totalStock), icon: Package, tone: "info" },
    { label: "Today's Expense", value: fmtINR(p.todayExpense), icon: Receipt, tone: "warning", hint: "Material + Maint." },
    { label: "Monthly Expense", value: fmtINR(p.monthExpense), icon: TrendingDown, tone: "danger" },
    { label: "Today's Tons Used", value: fmtTons(p.todayTons), icon: Calendar, tone: "info" },
    { label: "Monthly Tons Used", value: fmtTons(p.monthTons), icon: CalendarDays, tone: "info" },
    { label: "Today's Maintenance", value: fmtINR(p.todayMaint), icon: Wrench, tone: "warning" },
    { label: "Monthly Maintenance", value: fmtINR(p.monthMaint), icon: TrendingUp, tone: "success" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {stats.map((s) => <Card key={s.label} s={s} />)}
    </div>
  );
}

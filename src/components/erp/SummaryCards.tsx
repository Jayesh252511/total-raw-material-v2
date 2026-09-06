import { useState, useRef } from "react";
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

const TONE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  success: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  warning: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  info:    { bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" },
  danger:  { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
};

function Card({ s }: { s: Stat }) {
  const Icon = s.icon;
  const tone = s.tone ?? "primary";
  const colors = TONE_BADGE[tone];

  const Comp = s.onClick ? "button" : "div";

  return (
    <Comp
      onClick={s.onClick}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4 text-left w-[240px] shrink-0 sm:w-full overflow-hidden flex flex-col justify-between min-h-[110px] transition-all hover:border-primary/40 hover:shadow-card shadow-soft snap-align-start",
        s.onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {s.label}
        </span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", colors.bg, colors.text, colors.border)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2">
        <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground truncate">
          {s.value}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          {s.hint || "Live metric"}
        </p>
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

type Category = "all" | "money" | "stock" | "expenses";

export function SummaryCards(p: Props) {
  const [openTotal, setOpenTotal] = useState(false);
  const [openLock, setOpenLock] = useState(false);
  const [activeCat, setActiveCat] = useState<Category>("all");

  const allStats: (Stat & { cat: "money" | "stock" | "expenses" })[] = [
    { label: "Total Money", value: fmtINR(p.totalMoney), icon: Wallet, tone: "primary", hint: "Tap for history", onClick: () => setOpenTotal(true), cat: "money" },
    { label: "Sell Received", value: fmtINR(p.sellMoney), icon: ShoppingCart, tone: "success", hint: "Total payment received", cat: "money" },
    { label: "Amt w/o GB (w/o GST)", value: fmtINR(p.sellWithoutGBNoGST), icon: Coins, tone: "success", hint: "Sell total excl. GB/GST", cat: "money" },
    { label: "Lock Amount", value: fmtINR(p.lockMoney), icon: Lock, tone: "warning", hint: "Add-only · tap for history", onClick: () => setOpenLock(true), cat: "money" },

    { label: "Total Stock", value: fmtTons(p.totalStock), icon: Package, tone: "info", hint: "Current stock balance", cat: "stock" },
    { label: "Yearly Raw Material", value: fmtINR(p.yearRM), icon: Package, tone: "info", hint: "Purchased material cost", cat: "stock" },
    { label: "Today's Tons Used", value: fmtTons(p.todayTons), icon: Calendar, tone: "info", hint: "Tons sold today", cat: "stock" },
    { label: "Yearly Tons Used", value: fmtTons(p.yearTons), icon: CalendarDays, tone: "info", hint: "Total tons sold", cat: "stock" },

    { label: "Today's Expense", value: fmtINR(p.todayExpense), icon: Receipt, tone: "warning", hint: "Material + Maint.", cat: "expenses" },
    { label: "Yearly Expense", value: fmtINR(p.yearExpense), icon: TrendingDown, tone: "danger", hint: "All outgoings", cat: "expenses" },
    { label: "Today's Maintenance", value: fmtINR(p.todayMaint), icon: Wrench, tone: "warning", hint: "Today's maintenance", cat: "expenses" },
    { label: "Yearly Maintenance", value: fmtINR(p.yearMaint), icon: TrendingUp, tone: "success", hint: "Maintenance expenses", cat: "expenses" },
  ];

  const filtered = activeCat === "all" ? allStats : allStats.filter(s => s.cat === activeCat);

  const tabCls = (active: boolean) => cn(
    "px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          <button onClick={() => setActiveCat("all")} className={tabCls(activeCat === "all")}>All</button>
          <button onClick={() => setActiveCat("money")} className={tabCls(activeCat === "money")}>Money</button>
          <button onClick={() => setActiveCat("stock")} className={tabCls(activeCat === "stock")}>Stock</button>
          <button onClick={() => setActiveCat("expenses")} className={tabCls(activeCat === "expenses")}>Expenses</button>
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
          {filtered.length} metrics
        </span>
      </div>

      {/* Clean Grid on Desktop, Clean Swipe Carousel on Mobile */}
      <div className="flex overflow-x-auto gap-3 pb-2 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-4 snap-x-mandatory hide-scrollbar">
        {filtered.map((s) => <Card key={s.label} s={s} />)}
      </div>

      <MoneyHistoryDialog open={openTotal} onOpenChange={setOpenTotal} field="total_money" title="Total Money — History" />
      <MoneyHistoryDialog open={openLock} onOpenChange={setOpenLock} field="lock_money" title="Lock Amount — History" />
    </div>
  );
}

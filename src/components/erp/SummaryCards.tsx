import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Package, Receipt, Wrench, Calendar, CalendarDays, ShoppingCart, Lock, Coins, Filter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmtINR, fmtTons } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoneyHistoryDialog } from "@/components/erp/MoneyHistoryDialog";

type Category = "all" | "money" | "stock" | "expenses";

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  category: Category;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  hint?: string;
  sparkColor?: string;
  onClick?: () => void;
};

function MiniSparkline({ color = "#3b82f6" }: { color?: string }) {
  return (
    <svg className="w-14 h-6 opacity-50 group-hover:opacity-100 transition-all shrink-0" viewBox="0 0 60 24" fill="none">
      <path
        d="M2 18 L12 14 L22 17 L32 9 L42 11 L52 4 L58 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 18 L12 14 L22 17 L32 9 L42 11 L52 4 L58 7 L58 24 L2 24 Z"
        fill={color}
        fillOpacity="0.15"
      />
    </svg>
  );
}

function Card({ s }: { s: Stat }) {
  const Icon = s.icon;
  const toneMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/15 border-amber-500/20",
    info: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    danger: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  const sparkColorMap = {
    primary: "#6366f1",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#0284c7",
    danger: "#f43f5e",
  };

  const Comp = s.onClick ? "button" : "div";
  return (
    <Comp
      onClick={s.onClick}
      className={cn(
        "group relative rounded-xl border bg-card/90 backdrop-blur-sm p-3 sm:p-4 shadow-soft transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 text-left w-full overflow-hidden",
        s.onClick && "cursor-pointer hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
          <p className="mt-1 text-sm sm:text-lg font-bold tracking-tight tabular-nums truncate text-foreground">{s.value}</p>
        </div>
        <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border", toneMap[s.tone ?? "primary"])}>
          <Icon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-border/40">
        <span className="text-[9px] sm:text-[10.5px] text-muted-foreground truncate max-w-[130px] sm:max-w-[180px]">{s.hint || "Updated live"}</span>
        <MiniSparkline color={sparkColorMap[s.tone ?? "primary"]} />
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
  const [activeTab, setActiveTab] = useState<Category>("all");

  const stats: Stat[] = [
    { label: "Total Money", value: fmtINR(p.totalMoney), icon: Wallet, category: "money", tone: "primary", hint: "Tap for history", onClick: () => setOpenTotal(true) },
    { label: "Sell Received", value: fmtINR(p.sellMoney), icon: ShoppingCart, category: "money", tone: "success", hint: "Total payment received" },
    { label: "Amt w/o GB (w/o GST)", value: fmtINR(p.sellWithoutGBNoGST), icon: Coins, category: "money", tone: "success", hint: "Sell total excl. GB/GST" },
    { label: "Lock Amount", value: fmtINR(p.lockMoney), icon: Lock, category: "money", tone: "warning", hint: "Add-only · tap for history", onClick: () => setOpenLock(true) },
    { label: "Total Stock", value: fmtTons(p.totalStock), icon: Package, category: "stock", tone: "info", hint: "Current stock balance" },
    { label: "Yearly Raw Material", value: fmtINR(p.yearRM), icon: Package, category: "stock", tone: "info", hint: "Purchased material cost" },
    { label: "Today's Expense", value: fmtINR(p.todayExpense), icon: Receipt, category: "expenses", tone: "warning", hint: "Material + Maint." },
    { label: "Yearly Expense", value: fmtINR(p.yearExpense), icon: TrendingDown, category: "expenses", tone: "danger", hint: "All outgoings" },
    { label: "Today's Tons Used", value: fmtTons(p.todayTons), icon: Calendar, category: "stock", tone: "info", hint: "Tons sold today" },
    { label: "Yearly Tons Used", value: fmtTons(p.yearTons), icon: CalendarDays, category: "stock", tone: "info", hint: "Total tons sold" },
    { label: "Today's Maintenance", value: fmtINR(p.todayMaint), icon: Wrench, category: "expenses", tone: "warning", hint: "Today's maintenance" },
    { label: "Yearly Maintenance", value: fmtINR(p.yearMaint), icon: TrendingUp, category: "expenses", tone: "success", hint: "Maintenance expenses" },
  ];

  const filteredStats = activeTab === "all" ? stats : stats.filter(s => s.category === activeTab);

  const tabs: { id: Category; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.length },
    { id: "money", label: "💰 Money", count: stats.filter(s => s.category === "money").length },
    { id: "stock", label: "📦 Stock", count: stats.filter(s => s.category === "stock").length },
    { id: "expenses", label: "🔧 Expenses", count: stats.filter(s => s.category === "expenses").length },
  ];

  return (
    <>
      <div className="space-y-3">
        {/* Category Tabs / Mobile Segmented Control */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/50 text-xs shadow-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-soft border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline-block font-medium">
            Showing {filteredStats.length} metrics
          </span>
        </div>

        {/* Card Grid - Mobile 2 Columns, Desktop 4 Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredStats.map((s) => (
            <Card key={s.label} s={s} />
          ))}
        </div>
      </div>

      <MoneyHistoryDialog open={openTotal} onOpenChange={setOpenTotal} field="total_money" title="Total Money — History" />
      <MoneyHistoryDialog open={openLock} onOpenChange={setOpenLock} field="lock_money" title="Lock Amount — History" />
    </>
  );
}


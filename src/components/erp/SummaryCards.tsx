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

function Sparkline({ tone }: { tone: string }) {
  const strokeColor = tone === 'success' ? '#10b981' : tone === 'warning' ? '#f59e0b' : tone === 'danger' ? '#f43f5e' : tone === 'info' ? '#38bdf8' : '#6366f1';
  const isDown = tone === 'danger';
  return (
    <svg className="w-12 h-5 opacity-65 group-hover:opacity-100 transition-opacity" viewBox="0 0 60 25" fill="none">
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
  const cardRef = useRef<HTMLElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg)");
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    setSpotlight({ x: Math.round((x / rect.width) * 100), y: Math.round((y / rect.height) * 100), opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

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
      ref={cardRef as any}
      onClick={s.onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: "transform 0.15s ease-out, box-shadow 0.3s ease" }}
      className={cn(
        "group relative rounded-xl border bg-card/90 backdrop-blur-md p-3.5 sm:p-4 shadow-soft text-left w-full overflow-hidden flex flex-col justify-between min-h-[102px] transform-gpu",
        glowMap[s.tone ?? "primary"],
        s.onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      {/* 3D Laser Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-xl"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(350px circle at ${spotlight.x}% ${spotlight.y}%, rgba(99, 102, 241, 0.18), transparent 70%)`
        }}
      />

      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.label}</p>
          <p className="mt-1 text-base sm:text-lg font-bold tracking-tight tabular-nums truncate">{s.value}</p>
        </div>
        <div className={cn("flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-110", toneMap[s.tone ?? "primary"])}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-border/30 relative z-10">
        <p className="text-[10px] text-muted-foreground truncate max-w-[65%]">{s.hint || "Live metric"}</p>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 p-1 backdrop-blur-md">
          <button
            onClick={() => setActiveCat("all")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
              activeCat === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveCat("money")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
              activeCat === "money" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            💰 Money
          </button>
          <button
            onClick={() => setActiveCat("stock")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
              activeCat === "stock" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            📦 Stock
          </button>
          <button
            onClick={() => setActiveCat("expenses")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
              activeCat === "expenses" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            🔧 Expenses
          </button>
        </div>

        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
          Showing {filtered.length} metrics
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((s) => <Card key={s.label} s={s} />)}
      </div>

      <MoneyHistoryDialog open={openTotal} onOpenChange={setOpenTotal} field="total_money" title="Total Money — History" />
      <MoneyHistoryDialog open={openLock} onOpenChange={setOpenLock} field="lock_money" title="Lock Amount — History" />
    </div>
  );
}

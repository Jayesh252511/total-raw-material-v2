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

// Tone → gradient color pairs for the card bg strip
const TONE_GRADIENT: Record<string, { from: string; to: string; icon: string; border: string; badge: string }> = {
  primary:  { from: "rgba(99,102,241,0.13)", to: "rgba(99,102,241,0)",   icon: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.22)", badge: "#6366f1" },
  success:  { from: "rgba(16,185,129,0.13)", to: "rgba(16,185,129,0)",   icon: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.22)", badge: "#10b981" },
  warning:  { from: "rgba(245,158,11,0.13)", to: "rgba(245,158,11,0)",   icon: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)", badge: "#f59e0b" },
  info:     { from: "rgba(56,189,248,0.13)", to: "rgba(56,189,248,0)",   icon: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.22)", badge: "#38bdf8" },
  danger:   { from: "rgba(244,63,94,0.13)",  to: "rgba(244,63,94,0)",    icon: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.22)",  badge: "#f43f5e" },
};

const TONE_TEXT: Record<string, string> = {
  primary: "#818cf8",
  success: "#34d399",
  warning: "#fbbf24",
  info:    "#7dd3fc",
  danger:  "#fb7185",
};

function Card({ s }: { s: Stat }) {
  const Icon = s.icon;
  const tone = s.tone ?? "primary";
  const colors = TONE_GRADIENT[tone];
  const textColor = TONE_TEXT[tone];

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
    const rotateX = -((y - centerY) / centerY) * 5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    setSpotlight({ x: Math.round((x / rect.width) * 100), y: Math.round((y / rect.height) * 100), opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  const Comp = s.onClick ? "button" : "div";

  return (
    <Comp
      ref={cardRef as any}
      onClick={s.onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: "transform 0.15s ease-out",
        border: `1px solid ${colors.border}`,
        background: `linear-gradient(115deg, ${colors.from} 0%, transparent 60%)`,
      }}
      className={cn(
        "group relative rounded-xl backdrop-blur-md p-4 sm:p-4 text-left w-full overflow-hidden flex flex-col justify-between min-h-[108px] transform-gpu",
        s.onClick && "cursor-pointer"
      )}
    >
      {/* Very subtle base background fill */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: "rgba(15,23,42,0.55)" }}
      />

      {/* Streaming-card style large ghost icon — right side like a character portrait, very low opacity */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-full flex items-end justify-end overflow-hidden rounded-xl"
        style={{ width: "52%" }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "110px",
            height: "110px",
            background: `radial-gradient(ellipse at 60% 60%, ${colors.icon} 0%, transparent 75%)`,
            borderRadius: "50%",
            transform: "translate(20%, 25%)",
          }}
        >
          <Icon
            className="absolute"
            style={{
              width: "72px",
              height: "72px",
              color: textColor,
              opacity: 0.10,
              strokeWidth: 1.2,
              filter: "blur(0.5px)",
              transition: "opacity 0.3s",
            }}
          />
        </div>
        {/* On hover, icon becomes slightly more visible */}
        <Icon
          className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-[0.18] transition-opacity duration-300"
          style={{ width: "28px", height: "28px", color: textColor, strokeWidth: 1.5 }}
        />
      </div>

      {/* Left-side gradient strip — like the colored band in streaming cards */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: colors.badge, opacity: 0.7 }}
      />

      {/* Laser cursor spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-xl"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(280px circle at ${spotlight.x}% ${spotlight.y}%, ${colors.from.replace("0.13", "0.22")}, transparent 65%)`
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-between pl-2">
        {/* Top row: label */}
        <p
          className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest truncate"
          style={{ color: textColor, opacity: 0.8 }}
        >
          {s.label}
        </p>

        {/* Middle: big value */}
        <p className="mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums truncate text-white/90">
          {s.value}
        </p>

        {/* Bottom: hint */}
        <p className="mt-1.5 text-[10px] text-white/35 truncate">
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
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 p-1 backdrop-blur-md">
          <button onClick={() => setActiveCat("all")} className={tabCls(activeCat === "all")}>All</button>
          <button onClick={() => setActiveCat("money")} className={tabCls(activeCat === "money")}>💰 Money</button>
          <button onClick={() => setActiveCat("stock")} className={tabCls(activeCat === "stock")}>📦 Stock</button>
          <button onClick={() => setActiveCat("expenses")} className={tabCls(activeCat === "expenses")}>🔧 Expenses</button>
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
          {filtered.length} metrics
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

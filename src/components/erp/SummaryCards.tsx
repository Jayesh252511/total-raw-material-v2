import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Package, Receipt, Wrench, Calendar, CalendarDays, ShoppingCart, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fmtINR, fmtTons } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

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

type MoneyLog = {
  id: string;
  created_at: string;
  before: number;
  after: number;
  delta: number;
  note: string | null;
  device_info: string | null;
};

function MoneyHistoryDialog({ open, onOpenChange, field, title }: { open: boolean; onOpenChange: (o: boolean) => void; field: "total_money" | "sell_money" | "lock_money"; title: string }) {
  const [logs, setLogs] = useState<MoneyLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, created_at, details, device_info")
        .eq("entity", "settings")
        .order("created_at", { ascending: false })
        .limit(500);
      const out: MoneyLog[] = [];
      for (const r of data || []) {
        const d = ((r as { details: Record<string, unknown> }).details || {}) as {
          before?: number | Record<string, number>;
          after?: number | Record<string, number>;
          added_money?: number;
          added_lock_money?: number;
          field?: string;
          note?: string;
        };
        let before = NaN;
        let after = NaN;
        // Case 1: object form (settings_changed before/after = {field: val,...})
        if (typeof d.before === "object" && d.before && typeof d.after === "object" && d.after) {
          before = Number((d.before as Record<string, number>)[field] ?? NaN);
          after = Number((d.after as Record<string, number>)[field] ?? NaN);
        }
        // Case 2: simple add money form (before/after = numbers, field implied by added_*)
        else if (typeof d.before === "number" && typeof d.after === "number") {
          const isLockEntry = "added_lock_money" in d;
          const matchesField = (field === "lock_money" && isLockEntry) || (field === "total_money" && !isLockEntry && "added_money" in d);
          if (matchesField) {
            before = d.before;
            after = d.after;
          }
        }
        if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) continue;
        out.push({
          id: (r as { id: string }).id,
          created_at: (r as { created_at: string }).created_at,
          before,
          after,
          delta: after - before,
          note: d.note ?? null,
          device_info: (r as { device_info: string | null }).device_info,
        });
      }
      setLogs(out);
      setLoading(false);
    })();
  }, [open, field]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No money changes yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const added = l.delta > 0;
              return (
                <div key={l.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm font-semibold tabular-nums", added ? "text-success" : "text-destructive")}>
                      {added ? "+" : ""}{fmtINR(l.delta)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                    {fmtINR(l.before)} → {fmtINR(l.after)}
                  </div>
                  {l.note && <div className="mt-1 text-xs font-medium">📝 {l.note}</div>}
                  {l.device_info && <div className="mt-1 text-[10px] text-muted-foreground truncate">{l.device_info}</div>}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  const [openSell, setOpenSell] = useState(false);
  const [openLock, setOpenLock] = useState(false);
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
  // Suppress unused warning for openSell setter
  void openSell;
  void setOpenSell;
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

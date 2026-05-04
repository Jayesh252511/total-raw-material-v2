import { AlertTriangle, AlertCircle, TrendingUp } from "lucide-react";
import type { RawMaterial, Expense, Settings } from "@/lib/erpStore";
import { fmtINR } from "@/lib/format";

type Props = { settings: Settings; totalStock: number; rawMaterials: RawMaterial[]; expenses: Expense[] };

export function AlertsBar({ settings, totalStock, rawMaterials, expenses }: Props) {
  const alerts: { tone: "warning" | "danger" | "info"; msg: string; icon: typeof AlertTriangle }[] = [];
  if (settings.total_money < settings.low_money_threshold) {
    alerts.push({ tone: "danger", icon: AlertCircle, msg: `Low money: ${fmtINR(settings.total_money)} (below ${fmtINR(settings.low_money_threshold)})` });
  }
  if (totalStock < settings.low_stock_threshold) {
    alerts.push({ tone: "warning", icon: AlertTriangle, msg: `Low stock: ${totalStock.toFixed(2)} t (below ${settings.low_stock_threshold} t)` });
  }
  const recent = [...rawMaterials.map((r) => Number(r.total_amount)), ...expenses.map((e) => Number(e.amount))];
  const high = recent.filter((v) => v >= settings.high_txn_threshold);
  if (high.length > 0) {
    alerts.push({ tone: "info", icon: TrendingUp, msg: `${high.length} high transaction(s) above ${fmtINR(settings.high_txn_threshold)}` });
  }

  if (alerts.length === 0) return null;
  const toneCls = {
    warning: "border-warning/40 bg-warning/10 text-warning-foreground",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    info: "border-info/40 bg-info/10 text-info",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${toneCls[a.tone]}`}>
            <Icon className="h-3.5 w-3.5" />
            {a.msg}
          </div>
        );
      })}
    </div>
  );
}

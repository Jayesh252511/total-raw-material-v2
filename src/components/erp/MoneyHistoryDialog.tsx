import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type MoneyLog = {
  id: string;
  created_at: string;
  before: number;
  after: number;
  delta: number;
  note: string | null;
  device_info: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  field: "total_money" | "sell_money" | "lock_money";
  title: string;
};

export function MoneyHistoryDialog({ open, onOpenChange, field, title }: Props) {
  const [logs, setLogs] = useState<MoneyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();

  const loadLogs = async () => {
    setLoading(true);
    try {
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
          added_to_lock_and_total?: number;
          total_before?: number;
          total_after?: number;
          lock_before?: number;
          lock_after?: number;
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
          const isMoneyEntry = "added_money" in d;
          const isCombinedEntry = "added_to_lock_and_total" in d;
          
          const matchesField = 
            (field === "lock_money" && (isLockEntry || isMoneyEntry || isCombinedEntry)) || 
            (field === "total_money" && (isMoneyEntry || isCombinedEntry));
            
          if (matchesField) {
            if (isCombinedEntry && field === "lock_money") {
              before = Number(d.lock_before ?? NaN);
              after = Number(d.lock_after ?? NaN);
            } else if (isCombinedEntry && field === "total_money") {
              before = Number(d.total_before ?? NaN);
              after = Number(d.total_after ?? NaN);
            } else {
              before = d.before;
              after = d.after;
            }
          }
        }
        
        if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
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
    } catch (err: any) {
      toast.error("Failed to load history logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, field]);

  async function handleDelete(log: MoneyLog) {
    if (!confirm(`Are you sure you want to delete this log entry for ${fmtINR(log.delta)}?\n\nThis will remove the transaction record from history.`)) {
      return;
    }

    const revertMoney = confirm(
      `Do you also want to REVERT the money in Settings?\n\n` +
      `• Click OK to reverse the transaction's effect: ${log.delta > 0 ? "Deduct" : "Add back"} ${fmtINR(Math.abs(log.delta))} from Settings.\n` +
      `• Click Cancel to ONLY delete the log (keeps settings balance unchanged, perfect for duplicate logs).`
    );

    try {
      if (revertMoney) {
        const { data: s } = await supabase.from("settings").select("total_money, lock_money").eq("id", 1).single();
        if (s) {
          const patch: Record<string, number> = {};
          if (field === "total_money") {
            patch.total_money = Number(s.total_money) - log.delta;
          } else if (field === "lock_money") {
            patch.lock_money = Number(s.lock_money) - log.delta;
            patch.total_money = Number(s.total_money) - log.delta;
          }
          const { error: patchErr } = await supabase.from("settings").update(patch).eq("id", 1);
          if (patchErr) throw patchErr;
        }
      }

      const { error } = await supabase.from("audit_logs").delete().eq("id", log.id);
      if (error) throw error;

      toast.success("Transaction log deleted successfully");
      setLogs((prev) => prev.filter((item) => item.id !== log.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete log");
    }
  }

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
                <div key={l.id} className="relative rounded-lg border bg-card p-3 pr-11 transition-all hover:border-primary/20">
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
                  
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(l)}
                      title="Delete this history entry"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Expense } from "@/lib/erpStore";
import { fmtINR, todayStr, isToday, isThisMonth } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { CalendarDays, Plus, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = { rows: Expense[]; readOnly: boolean; onChanged?: () => void | Promise<void> };

const PRESETS = ["Electricity", "Diesel", "Salary", "Repair", "Transport", "Other"];

export function ExpensesTable({ rows, readOnly, onChanged }: Props) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (from && r.entry_date < from) return false;
      if (to && r.entry_date > to) return false;
      return true;
    });
  }, [rows, q, from, to]);

  const todayTot = filtered.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.amount), 0);
  const monthTot = filtered.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.amount), 0);

  async function addRow() {
    const { data, error } = await supabase.from("expenses").insert({ entry_date: todayStr() }).select().single();
    if (error) return toast.error(error.message);
    if (data) await logAudit("created", "expense", data.id, { row: data });
    await onChanged?.();
    toast.success("Row added");
  }

  async function updateField(row: Expense, field: "entry_date" | "name" | "amount", value: string) {
    const patch: { entry_date?: string; name?: string; amount?: number } = {};
    if (field === "amount") patch[field] = Number(value) || 0;
    else patch[field] = value;
    const before = { [field]: row[field] };
    const { error } = await supabase.from("expenses").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);

    if (field === "amount") {
      const delta = (Number(value) || 0) - Number(row.amount);
      if (delta !== 0) {
        const { data: s } = await supabase.from("settings").select("total_money").eq("id", 1).single();
        if (s) await supabase.from("settings").update({ total_money: Number(s.total_money) - delta }).eq("id", 1);
      }
    }
    await logAudit("updated", "expense", row.id, { field, before, after: { [field]: patch[field] } });
    await onChanged?.();
  }

  async function deleteRow(row: Expense) {
    if (!confirm(`Delete expense #${row.serial_number}?`)) return;
    const { error } = await supabase.from("expenses").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    const { data: s } = await supabase.from("settings").select("total_money").eq("id", 1).single();
    if (s) await supabase.from("settings").update({ total_money: Number(s.total_money) + Number(row.amount) }).eq("id", 1);
    await logAudit("deleted", "expense", row.id, { row });
    await onChanged?.();
    toast.success("Row deleted");
  }

  return (
    <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-sm">Maintenance / Expense Sheet</h3>
          <p className="text-xs text-muted-foreground">Today: {fmtINR(todayTot)} · Month: {fmtINR(monthTot)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search expense..." className="h-10 sm:h-8 sm:w-44 pl-7 text-sm sm:text-xs" />
          </div>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 sm:h-8 sm:w-36 text-sm sm:text-xs" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 sm:h-8 sm:w-36 text-sm sm:text-xs" />
          </label>
          {(q || from || to) && (
            <Button variant="outline" size="sm" onClick={() => { setQ(""); setFrom(""); setTo(""); }} className="h-10 sm:h-8">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          {!readOnly && (
            <Button size="sm" onClick={addRow} className="h-10 sm:h-8 col-span-2 sm:col-span-1"><Plus className="h-3.5 w-3.5 mr-1" />Add Row</Button>
          )}
        </div>
      </div>
      <div className="space-y-2 p-3 md:hidden">
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No expenses yet. Tap Add Row to start.</p>}
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border bg-background p-3 shadow-soft">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">#{r.serial_number}</span>
              {!readOnly && (
                <button onClick={() => deleteRow(r)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-2">
              <label className="space-y-1">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">Date</span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input pl-8" />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">Expense Name</span>
                <input disabled={readOnly} list="expense-presets" defaultValue={r.name} placeholder="Electricity, Diesel..." onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">Amount</span>
                <input disabled={readOnly} type="number" step="0.01" defaultValue={r.amount} onBlur={(e) => Number(e.target.value) !== Number(r.amount) && updateField(r, "amount", e.target.value)} className="cell-input text-right tabular-nums" />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto -webkit-overflow-scrolling-touch md:block">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-14">#</th>
              <th className="px-3 py-2 text-left font-medium w-36">Date</th>
              <th className="px-3 py-2 text-left font-medium">Expense Name</th>
              <th className="px-3 py-2 text-right font-medium w-40">Amount</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No expenses yet.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-3 py-1 text-muted-foreground tabular-nums">{r.serial_number}</td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input" />
                </td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} list="expense-presets" defaultValue={r.name} placeholder="Electricity, Diesel..." onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" />
                </td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} type="number" step="0.01" defaultValue={r.amount} onBlur={(e) => Number(e.target.value) !== Number(r.amount) && updateField(r, "amount", e.target.value)} className="cell-input text-right tabular-nums" />
                </td>
                {!readOnly && (
                  <td className="px-2 py-1">
                    <button onClick={() => deleteRow(r)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="expense-presets">
        {PRESETS.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  );
}

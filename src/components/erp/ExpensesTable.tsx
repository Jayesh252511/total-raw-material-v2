import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Expense, ExpenseCategory } from "@/lib/erpStore";
import { fmtINR, todayStr, isToday, isThisYear } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { Plus, Search, Trash2, X, Fuel, UserCog, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = { rows: Expense[]; readOnly: boolean; onChanged?: () => void | Promise<void> };

const CATS: { key: ExpenseCategory; label: string; icon: typeof Fuel }[] = [
  { key: "petrol_diesel", label: "Petrol / Diesel", icon: Fuel },
  { key: "operator", label: "Operator", icon: UserCog },
  { key: "other", label: "Other", icon: Package },
];

export function ExpensesTable({ rows, readOnly, onChanged }: Props) {
  const [tab, setTab] = useState<ExpenseCategory>("petrol_diesel");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => rows.filter((r) => {
    if ((r.category || "other") !== tab) return false;
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (from && r.entry_date < from) return false;
    if (to && r.entry_date > to) return false;
    return true;
  }), [rows, tab, q, from, to]);

  const todayTot = filtered.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.amount), 0);
  const yearTot = filtered.filter((r) => isThisYear(r.entry_date)).reduce((s, r) => s + Number(r.amount), 0);

  async function addRow() {
    const { data, error } = await supabase.from("expenses").insert({ entry_date: todayStr(), category: tab }).select().single();
    if (error) return toast.error(error.message);
    if (data) await logAudit("created", "expense", data.id, { row: data });
    await onChanged?.();
    toast.success("Row added");
  }

  async function updateField(row: Expense, field: "entry_date" | "name" | "amount" | "serial_number", value: string) {
    const newVal = field === "amount" || field === "serial_number" ? Number(value) || 0 : value;
    const before = { [field]: row[field] };
    const patch = { [field]: newVal } as { entry_date?: string; name?: string; amount?: number; serial_number?: number };
    const { error } = await supabase.from("expenses").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    if (field === "amount") {
      const delta = (Number(value) || 0) - Number(row.amount);
      if (delta !== 0) {
        const { data: s } = await supabase.from("settings").select("total_money").eq("id", 1).single();
        if (s) await supabase.from("settings").update({ total_money: Number(s.total_money) - delta }).eq("id", 1);
      }
    }
    await logAudit("updated", "expense", row.id, { field, before, after: { [field]: newVal } });
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
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="grid grid-cols-3 gap-2">
        {CATS.map((c) => {
          const Icon = c.icon;
          const active = tab === c.key;
          const count = rows.filter((r) => (r.category || "other") === c.key).length;
          return (
            <button key={c.key} onClick={() => setTab(c.key)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all ${active ? "border-primary bg-primary text-primary-foreground shadow-elevated" : "bg-card text-muted-foreground hover:bg-muted/40"}`}>
              <Icon className="h-4 w-4" />
              <span className="text-center leading-tight">{c.label}</span>
              <span className={`text-[10px] ${active ? "opacity-80" : ""}`}>{count} entries</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-sm">{CATS.find((c) => c.key === tab)?.label}</h3>
            <p className="text-xs text-muted-foreground">Today: {fmtINR(todayTot)} · Year: {fmtINR(yearTot)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="h-10 sm:h-8 sm:w-44 pl-7 text-sm sm:text-xs" />
            </div>
            <label className="space-y-1"><span className="text-[10px] uppercase text-muted-foreground">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 sm:h-8 sm:w-36 text-sm sm:text-xs" /></label>
            <label className="space-y-1"><span className="text-[10px] uppercase text-muted-foreground">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 sm:h-8 sm:w-36 text-sm sm:text-xs" /></label>
            {(q || from || to) && <Button variant="outline" size="sm" onClick={() => { setQ(""); setFrom(""); setTo(""); }} className="h-10 sm:h-8"><X className="h-3.5 w-3.5" /> Clear</Button>}
            {!readOnly && <Button size="sm" onClick={addRow} className="h-10 sm:h-8 col-span-2 sm:col-span-1"><Plus className="h-3.5 w-3.5 mr-1" />Add Row</Button>}
          </div>
        </div>

        <div className="space-y-2 p-3 md:hidden">
          {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No entries.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><span>#</span><input disabled={readOnly} type="number" defaultValue={r.serial_number} onBlur={(e) => Number(e.target.value) !== Number(r.serial_number) && updateField(r, "serial_number", e.target.value)} className="cell-input !h-6 !w-16 !px-1 text-xs tabular-nums" /></div>
                {!readOnly && <button onClick={() => deleteRow(r)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <div className="grid gap-2">
                <label><span className="text-[10px] uppercase text-muted-foreground">Date</span><input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input" /></label>
                <label><span className="text-[10px] uppercase text-muted-foreground">Description</span><input disabled={readOnly} defaultValue={r.name} placeholder="Details" onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" /></label>
                <label><span className="text-[10px] uppercase text-muted-foreground">Amount</span><input disabled={readOnly} type="number" step="0.01" defaultValue={r.amount} onBlur={(e) => Number(e.target.value) !== Number(r.amount) && updateField(r, "amount", e.target.value)} className="cell-input text-right tabular-nums" /></label>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-14">#</th>
                <th className="px-3 py-2 text-left font-medium w-36">Date</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium w-40">Amount</th>
                {!readOnly && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No entries.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="px-1 py-1"><input disabled={readOnly} type="number" defaultValue={r.serial_number} onBlur={(e) => Number(e.target.value) !== Number(r.serial_number) && updateField(r, "serial_number", e.target.value)} className="cell-input text-left tabular-nums" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} defaultValue={r.name} placeholder="Details" onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="number" step="0.01" defaultValue={r.amount} onBlur={(e) => Number(e.target.value) !== Number(r.amount) && updateField(r, "amount", e.target.value)} className="cell-input text-right tabular-nums" /></td>
                  {!readOnly && <td className="px-2 py-1"><button onClick={() => deleteRow(r)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

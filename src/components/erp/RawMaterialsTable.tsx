import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RawMaterial } from "@/lib/erpStore";
import { fmtINR, fmtNum, todayStr, isToday, isThisMonth } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { CalendarDays, Plus, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = { rows: RawMaterial[]; readOnly: boolean; onChanged?: () => void | Promise<void> };

export function RawMaterialsTable({ rows, readOnly, onChanged }: Props) {
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

  const todayTot = filtered.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.total_amount), 0);
  const monthTot = filtered.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.total_amount), 0);
  const todayTons = filtered.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.quantity), 0);
  const monthTons = filtered.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.quantity), 0);

  async function addRow() {
    const { data, error } = await supabase.from("raw_materials").insert({ entry_date: todayStr() }).select().single();
    if (error) return toast.error(error.message);
    if (data) await logAudit("created", "raw_material", data.id, { row: data });
    await onChanged?.();
    toast.success("Row added");
  }

  async function updateField(row: RawMaterial, field: "entry_date" | "name" | "rate" | "quantity", value: string) {
    const patch: { entry_date?: string; name?: string; rate?: number; quantity?: number } = {};
    if (field === "rate" || field === "quantity") patch[field] = Number(value) || 0;
    else patch[field] = value;
    const before = { [field]: row[field] };
    const { error } = await supabase.from("raw_materials").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);

    // Money deduction logic — recompute delta only when rate/quantity changes
    if (field === "rate" || field === "quantity") {
      const newTotal = (field === "rate" ? Number(value) : Number(row.rate)) * (field === "quantity" ? Number(value) : Number(row.quantity));
      const delta = newTotal - Number(row.total_amount || 0);
      if (delta !== 0) {
        const { data: s } = await supabase.from("settings").select("total_money").eq("id", 1).single();
        if (s) await supabase.from("settings").update({ total_money: Number(s.total_money) - delta }).eq("id", 1);
      }
    }
    await logAudit("updated", "raw_material", row.id, { field, before, after: { [field]: patch[field] } });
    await onChanged?.();
  }

  async function deleteRow(row: RawMaterial) {
    if (!confirm(`Delete entry #${row.serial_number}?`)) return;
    const { error } = await supabase.from("raw_materials").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    // Refund money
    const { data: s } = await supabase.from("settings").select("total_money").eq("id", 1).single();
    if (s) await supabase.from("settings").update({ total_money: Number(s.total_money) + Number(row.total_amount) }).eq("id", 1);
    await logAudit("deleted", "raw_material", row.id, { row });
    await onChanged?.();
    toast.success("Row deleted");
  }

  return (
    <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold text-sm">Raw Material Sheet</h3>
          <p className="text-xs text-muted-foreground">Today: {fmtINR(todayTot)} · {fmtNum(todayTons, 3)} t · Month: {fmtINR(monthTot)} · {fmtNum(monthTons, 3)} t</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name..." className="h-8 w-44 pl-7 text-xs" />
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-xs" />
          {!readOnly && (
            <Button size="sm" onClick={addRow} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" />Add Row</Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-14">#</th>
              <th className="px-3 py-2 text-left font-medium w-36">Date</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium w-32">Rate (₹/t)</th>
              <th className="px-3 py-2 text-right font-medium w-28">Qty (t)</th>
              <th className="px-3 py-2 text-right font-medium w-36">Total</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No entries yet. Click "Add Row" to start.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-3 py-1 text-muted-foreground tabular-nums">{r.serial_number}</td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input" />
                </td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} defaultValue={r.name} placeholder="Client / supplier" onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" />
                </td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} type="number" step="0.01" defaultValue={r.rate} onBlur={(e) => Number(e.target.value) !== Number(r.rate) && updateField(r, "rate", e.target.value)} className="cell-input text-right tabular-nums" />
                </td>
                <td className="px-1 py-1">
                  <input disabled={readOnly} type="number" step="0.001" defaultValue={r.quantity} onBlur={(e) => Number(e.target.value) !== Number(r.quantity) && updateField(r, "quantity", e.target.value)} className="cell-input text-right tabular-nums" />
                </td>
                <td className="px-3 py-1 text-right font-medium tabular-nums">{fmtINR(Number(r.total_amount))}</td>
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
    </div>
  );
}

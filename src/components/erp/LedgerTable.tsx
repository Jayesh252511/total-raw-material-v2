import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RawMaterial } from "@/lib/erpStore";
import { fmtINR, fmtNum, todayStr } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { Filter, Plus, Search, Trash2, X, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Mode = "purchase" | "sell";
type Props = { rows: (RawMaterial & { vehicle_number?: string })[]; readOnly: boolean; mode: Mode; onChanged?: () => void | Promise<void> };

// purchase: stock+, money- by payment | sell: stock-, money+ by payment
export function LedgerTable({ rows, readOnly, mode, onChanged }: Props) {
  const table = mode === "purchase" ? "raw_materials" : "sells";
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sheetDate, setSheetDate] = useState(todayStr());
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // filtered (search + date range)
  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (from && r.entry_date < from) return false;
    if (to && r.entry_date > to) return false;
    return true;
  }), [rows, q, from, to]);

  // Daily by sheetDate / Monthly by sheetDate's month
  const dayRows = filtered.filter((r) => r.entry_date === sheetDate);
  const monRows = filtered.filter((r) => r.entry_date.slice(0, 7) === sheetDate.slice(0, 7));
  const dayAmt = dayRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const dayQty = dayRows.reduce((s, r) => s + Number(r.quantity), 0);
  const monAmt = monRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const monQty = monRows.reduce((s, r) => s + Number(r.quantity), 0);

  // Add row form state
  const [form, setForm] = useState({ entry_date: todayStr(), name: "", rate: "", quantity: "", payment: "", vehicle_number: "" });
  function resetForm() { setForm({ entry_date: todayStr(), name: "", rate: "", quantity: "", payment: "", vehicle_number: "" }); }

  // Money column to update: sells use a separate sell_money pot
  const moneyCol = mode === "purchase" ? "total_money" : "sell_money";

  async function adjustMoney(delta: number) {
    if (!delta) return;
    const { data: s } = await supabase.from("settings").select(moneyCol).eq("id", 1).single();
    if (!s) return;
    const current = Number((s as Record<string, number>)[moneyCol] || 0);
    // purchase: subtract payment from total_money. sell: add payment to sell_money.
    const next = mode === "purchase" ? current - delta : current + delta;
    const update = mode === "purchase" ? { total_money: next } : { sell_money: next };
    await supabase.from("settings").update(update).eq("id", 1);
  }

  async function addRow() {
    const rate = Number(form.rate) || 0;
    const qty = Number(form.quantity) || 0;
    const payment = Number(form.payment) || 0;
    const total = rate * qty;
    const insertPayload: Record<string, unknown> = { entry_date: form.entry_date, name: form.name, rate, quantity: qty, payment };
    if (mode === "sell") insertPayload.vehicle_number = form.vehicle_number;
    const { data, error } = await (supabase.from(table as never) as never as ReturnType<typeof supabase.from>)
      .insert(insertPayload).select().single();
    if (error) return toast.error(error.message);

    if (payment) await adjustMoney(payment);
    if (data) await logAudit("created", table, (data as { id: string }).id, { row: data, total });
    setAddOpen(false);
    resetForm();
    await onChanged?.();
    toast.success("Entry added");
  }

  async function updateField(row: RawMaterial & { vehicle_number?: string }, field: "entry_date" | "name" | "rate" | "quantity" | "payment" | "vehicle_number", value: string) {
    const isNum = field === "rate" || field === "quantity" || field === "payment";
    const newVal = isNum ? Number(value) || 0 : value;
    const before = { [field]: (row as Record<string, unknown>)[field] };
    const { error } = await (supabase.from(table as never) as never as ReturnType<typeof supabase.from>)
      .update({ [field]: newVal }).eq("id", row.id);
    if (error) return toast.error(error.message);

    if (field === "payment") {
      const delta = (Number(value) || 0) - Number(row.payment || 0);
      if (delta !== 0) await adjustMoney(delta);
    }
    await logAudit("updated", table, row.id, { field, before, after: { [field]: newVal } });
    await onChanged?.();
  }

  async function deleteRow(row: RawMaterial) {
    if (!confirm(`Delete entry #${row.serial_number}?`)) return;
    const { error } = await (supabase.from(table as never) as never as ReturnType<typeof supabase.from>).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    if (Number(row.payment)) await adjustMoney(-Number(row.payment));
    await logAudit("deleted", table, row.id, { row });
    await onChanged?.();
    toast.success("Entry deleted");
  }

  function exportExcel() {
    const data = filtered.map((r) => ({
      "Pc No.": r.serial_number, Date: r.entry_date, Name: r.name,
      Qty: Number(r.quantity), Rate: Number(r.rate), Amount: Number(r.total_amount),
      Payment: Number(r.payment), Difference: Number(r.total_amount) - Number(r.payment),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === "purchase" ? "Raw Material" : "Sells");
    XLSX.writeFile(wb, `${mode}-${sheetDate}.xlsx`);
  }
  function exportPDF() {
    const doc = new jsPDF();
    doc.text(`${mode === "purchase" ? "Raw Material" : "Sells"} Sheet`, 14, 14);
    autoTable(doc, {
      startY: 20, styles: { fontSize: 8 },
      head: [["Pc", "Date", "Name", "Qty", "Rate", "Amount", "Payment", "Diff"]],
      body: filtered.map((r) => [r.serial_number, r.entry_date, r.name, Number(r.quantity), Number(r.rate), Number(r.total_amount).toFixed(2), Number(r.payment).toFixed(2), (Number(r.total_amount) - Number(r.payment)).toFixed(2)]),
    });
    doc.save(`${mode}-${sheetDate}.pdf`);
  }

  return (
    <div className="space-y-3">
      {/* Top control bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Date (Sheet)</Label>
          <Input type="date" value={sheetDate} onChange={(e) => setSheetDate(e.target.value)} className="h-10 w-44" />
          <p className="mt-1 text-xs text-muted-foreground">{sheetDate.split("-").reverse().join("-")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-10"><Filter className="h-4 w-4" /> Filter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Filter by date range</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name..." className="pl-8" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="text-[11px] font-medium uppercase text-muted-foreground">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                  <label><span className="text-[11px] font-medium uppercase text-muted-foreground">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
                </div>
                {(q || from || to) && (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Entries</span><span className="font-semibold">{filtered.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Qty</span><span className="font-semibold tabular-nums">{fmtNum(filtered.reduce((s, r) => s + Number(r.quantity), 0), 3)} t</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-semibold tabular-nums">{fmtINR(filtered.reduce((s, r) => s + Number(r.total_amount), 0))}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Payment</span><span className="font-semibold tabular-nums">{fmtINR(filtered.reduce((s, r) => s + Number(r.payment), 0))}</span></div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setQ(""); setFrom(""); setTo(""); }}><X className="h-4 w-4" /> Clear</Button>
                <Button onClick={() => setFilterOpen(false)}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-10"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="h-10"><FileText className="h-4 w-4" /> PDF</Button>
          {!readOnly && (
            <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-10"><Plus className="h-4 w-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{mode === "purchase" ? "Add Raw Material" : "Add Sell Entry"}</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-2">
                  <label><span className="text-[11px] font-medium uppercase text-muted-foreground">Date</span><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></label>
                  <label><span className="text-[11px] font-medium uppercase text-muted-foreground">Name</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client / supplier" /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[11px] font-medium uppercase text-muted-foreground">Qty (t)</span><Input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
                    <label><span className="text-[11px] font-medium uppercase text-muted-foreground">Rate (₹/t)</span><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></label>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-semibold tabular-nums">{fmtINR((Number(form.rate) || 0) * (Number(form.quantity) || 0))}</span></div>
                  <label><span className="text-[11px] font-medium uppercase text-muted-foreground">Payment (₹)</span><Input type="number" step="0.01" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} /></label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={addRow}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Daily/Monthly cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Daily Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtINR(dayAmt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Qty: {fmtNum(dayQty, 3)} t</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Monthly Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtINR(monAmt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Qty: {fmtNum(monQty, 3)} t</p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No entries. Tap Add to create one.</p>}
        {filtered.map((r) => {
          const diff = Number(r.total_amount) - Number(r.payment);
          return (
            <div key={r.id} className="rounded-xl border bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">#{r.serial_number} · {r.entry_date}</p>
                  <p className="text-sm font-semibold">{r.name || "—"}</p>
                </div>
                {!readOnly && (
                  <button onClick={() => deleteRow(r)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Qty</span><span className="tabular-nums">{fmtNum(Number(r.quantity), 3)} t</span></div>
                <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Rate</span><span className="tabular-nums">{fmtINR(Number(r.rate))}</span></div>
                <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Amount</span><span className="font-semibold tabular-nums">{fmtINR(Number(r.total_amount))}</span></div>
                <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Payment</span>
                  <input disabled={readOnly} type="number" step="0.01" defaultValue={r.payment} onBlur={(e) => Number(e.target.value) !== Number(r.payment) && updateField(r, "payment", e.target.value)} className="cell-input text-right tabular-nums !h-8" />
                </div>
                <div className={`col-span-2 rounded px-2 py-1.5 flex justify-between ${diff === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : diff > 0 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                  <span className="text-[10px] uppercase font-medium">Difference</span>
                  <span className="font-bold tabular-nums">{fmtINR(diff)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-soft md:block">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium w-16">Pc No.</th>
              <th className="px-3 py-2.5 text-left font-medium w-32">Date</th>
              <th className="px-3 py-2.5 text-left font-medium">Name</th>
              <th className="px-3 py-2.5 text-right font-medium w-24">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium w-24">Rate</th>
              <th className="px-3 py-2.5 text-right font-medium w-32">Amount</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">Payment</th>
              <th className="px-3 py-2.5 text-right font-medium w-28">Difference</th>
              {!readOnly && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No entries yet.</td></tr>}
            {filtered.map((r) => {
              const diff = Number(r.total_amount) - Number(r.payment);
              return (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.serial_number}</td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="date" defaultValue={r.entry_date} onBlur={(e) => e.target.value !== r.entry_date && updateField(r, "entry_date", e.target.value)} className="cell-input text-primary" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} defaultValue={r.name} placeholder="Name" onBlur={(e) => e.target.value !== r.name && updateField(r, "name", e.target.value)} className="cell-input" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="number" step="0.001" defaultValue={r.quantity} onBlur={(e) => Number(e.target.value) !== Number(r.quantity) && updateField(r, "quantity", e.target.value)} className="cell-input text-right tabular-nums" /></td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="number" step="0.01" defaultValue={r.rate} onBlur={(e) => Number(e.target.value) !== Number(r.rate) && updateField(r, "rate", e.target.value)} className="cell-input text-right tabular-nums" /></td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtNum(Number(r.total_amount), 2)}</td>
                  <td className="px-1 py-1"><input disabled={readOnly} type="number" step="0.01" defaultValue={r.payment} onBlur={(e) => Number(e.target.value) !== Number(r.payment) && updateField(r, "payment", e.target.value)} className="cell-input text-right tabular-nums" /></td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${diff === 0 ? "" : diff > 0 ? "text-destructive" : "text-amber-600"}`}>{fmtNum(diff, 2)}</td>
                  {!readOnly && <td className="px-2 py-1"><button onClick={() => deleteRow(r)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

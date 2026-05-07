import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { externalDb } from "@/integrations/external-db/client";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { fmtINR, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/pc-entries")({
  component: PcEntriesPage,
  head: () => ({
    meta: [
      { title: "Daily PC Entries — Live Mirror" },
      { name: "description", content: "Live read-only mirror of Daily PC Entries from external system." },
    ],
  }),
});

interface Entry {
  id: string;
  entry_date: string;
  pc_no: number;
  name: string;
  qty: number;
  rate: number;
  payment: number;
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
function formatDDMMYYYY(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function PcEntriesPage() {
  return (
    <ERPPageFrame showSummary={false} showAlerts={false}>
      {() => <PcEntriesMirror />}
    </ERPPageFrame>
  );
}

function PcEntriesMirror() {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await externalDb
      .from("entries")
      .select("*")
      .eq("entry_date", date)
      .order("pc_no", { ascending: true });
    setEntries((data as Entry[]) || []);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = externalDb
      .channel(`ext-entries-${date}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "entries", filter: `entry_date=eq.${date}` },
        () => load()
      )
      .subscribe();
    return () => { externalDb.removeChannel(ch); };
  }, [date, load]);

  const totals = useMemo(() => {
    let qty = 0, amt = 0, pay = 0;
    entries.forEach((e) => {
      const q = Number(e.qty) || 0, r = Number(e.rate) || 0;
      qty += q; amt += q * r; pay += Number(e.payment) || 0;
    });
    return { qty, amt, pay, diff: amt - pay };
  }, [entries]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-10">
            <Link to="/raw-material"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-44" />
            <p className="mt-1 text-xs text-muted-foreground">{formatDDMMYYYY(date)}</p>
          </div>
        </div>
        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">View only · Live</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Daily Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtINR(totals.amt)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Qty: {fmtNum(totals.qty, 3)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Difference</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${totals.diff > 0 ? "text-destructive" : ""}`}>{fmtINR(totals.diff)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Payment: {fmtINR(totals.pay)}</p>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Loading…</p>
          : entries.length === 0 ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No entries.</p>
          : entries.map((row) => {
            const amt = (Number(row.qty) || 0) * (Number(row.rate) || 0);
            const pay = Number(row.payment) || 0;
            const diff = amt - pay;
            return (
              <div key={row.id} className="rounded-xl border bg-card p-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">PC #{row.pc_no} · {formatDDMMYYYY(row.entry_date)}</p>
                </div>
                <p className="text-sm font-semibold mt-0.5">{row.name || "—"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Qty</span><span className="tabular-nums">{row.qty}</span></div>
                  <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Rate</span><span className="tabular-nums">{fmtINR(row.rate)}</span></div>
                  <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Amount</span><span className="font-semibold tabular-nums">{fmtINR(amt)}</span></div>
                  <div className="rounded bg-muted/30 px-2 py-1.5"><span className="block text-[10px] uppercase text-muted-foreground">Payment</span><span className="tabular-nums">{fmtINR(pay)}</span></div>
                  <div className={`col-span-2 rounded px-2 py-1.5 flex justify-between ${diff > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
                    <span className="text-[10px] uppercase font-medium">Difference</span>
                    <span className="font-bold tabular-nums">{fmtINR(diff)}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-soft md:block">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium w-20">Pc No.</th>
              <th className="px-3 py-2.5 text-left font-medium w-32">Date</th>
              <th className="px-3 py-2.5 text-left font-medium">Name</th>
              <th className="px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Rate</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-right font-medium">Payment</th>
              <th className="px-3 py-2.5 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              : entries.length === 0 ? <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No entries.</td></tr>
              : entries.map((row) => {
                const amt = (Number(row.qty) || 0) * (Number(row.rate) || 0);
                const pay = Number(row.payment) || 0;
                const diff = amt - pay;
                return (
                  <tr key={row.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 tabular-nums">{row.pc_no}</td>
                    <td className="px-3 py-2">{formatDDMMYYYY(row.entry_date)}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtINR(row.rate)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtINR(amt)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtINR(pay)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${diff > 0 ? "text-destructive" : ""}`}>{fmtINR(diff)}</td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-semibold">
              <td className="px-3 py-2" colSpan={3}>Daily Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.qty}</td>
              <td></td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtINR(totals.amt)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtINR(totals.pay)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtINR(totals.diff)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { RawMaterial, Expense } from "@/lib/erpStore";
import { Button } from "@/components/ui/button";

type Range = "today" | "7d" | "30d";

function bucketByDay<T>(items: T[], dateKey: (i: T) => string, valueKey: (i: T) => number, range: Range) {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const it of items) {
    const d = dateKey(it);
    if (map.has(d)) map.set(d, (map.get(d) || 0) + valueKey(it));
  }
  return Array.from(map, ([date, value]) => ({
    date: date.slice(5),
    value: Math.round(value * 100) / 100,
  }));
}

type Props = { rawMaterials: RawMaterial[]; expenses: Expense[] };

export function ReportsPanel({ rawMaterials, expenses }: Props) {
  const [range, setRange] = useState<Range>("7d");

  const expData = useMemo(() => bucketByDay(expenses, (e) => e.entry_date, (e) => Number(e.amount), range), [expenses, range]);
  const rmData = useMemo(() => bucketByDay(rawMaterials, (r) => r.entry_date, (r) => Number(r.total_amount), range), [rawMaterials, range]);
  const tonsData = useMemo(() => bucketByDay(rawMaterials, (r) => r.entry_date, (r) => Number(r.quantity), range), [rawMaterials, range]);

  const tooltipStyle = {
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Analytics</h3>
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {(["today", "7d", "30d"] as Range[]).map((r) => (
            <Button key={r} variant={range === r ? "default" : "ghost"} size="sm" className="h-7 text-xs px-3" onClick={() => setRange(r)}>
              {r === "today" ? "Today" : r === "7d" ? "Last 7 days" : "Monthly"}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Daily Maintenance Expense">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={expData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="var(--color-chart-4)" strokeWidth={2} dot={{ r: 3 }} name="Expense ₹" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily Raw Material Spend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} name="Spend ₹" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily Tons Purchased">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tonsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} name="Tons" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Combined Cash Outflow">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={expData.map((e, i) => ({ date: e.date, expense: e.value, rawmat: rmData[i]?.value || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="rawmat" stackId="a" fill="var(--color-chart-1)" name="Raw Material" radius={[0, 0, 0, 0]} />
              <Bar dataKey="expense" stackId="a" fill="var(--color-chart-4)" name="Maintenance" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{title}</h4>
      {children}
    </div>
  );
}

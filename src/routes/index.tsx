import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Download, History, ReceiptText, ShoppingCart } from "lucide-react";
import { AuditLogPanel } from "@/components/erp/AuditLogPanel";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/erp/ExportDialog";
import { fmtINR } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: ERPDashboard,
  head: () => ({
    meta: [
      { title: "Ledger ERP — Inventory Dashboard" },
      { name: "description", content: "Mobile-friendly ERP dashboard for raw materials, sells, expenses, and live history." },
    ],
  }),
});

function ERPDashboard() {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("pdf");

  const handleExport = (fmt: "excel" | "pdf") => {
    setExportFormat(fmt);
    setExportOpen(true);
  };

  return (
    <ERPPageFrame>
      {({ pcEntries, sells, expenses, settings, auditLogs, totalStock, effectiveMoney }) => {
        const sellMoney = (sells || []).reduce((s, e) => s + (Number(e.payment) || 0), 0);
        const yearExpense = (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const totalFlow = sellMoney + yearExpense;
        const revPct = totalFlow > 0 ? Math.min(Math.round((sellMoney / totalFlow) * 100), 100) : 50;
        const expPct = 100 - revPct;

        return (
          <div className="space-y-4">
            {/* Revenue vs Expense Health Progress Bar */}
            <div className="rounded-xl border bg-card/90 backdrop-blur-sm p-3 sm:p-4 shadow-soft">
              <div className="flex items-center justify-between gap-2 mb-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Sell In: {fmtINR(sellMoney)} ({revPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span>Total Out: {fmtINR(yearExpense)} ({expPct}%)</span>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                </div>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div style={{ width: `${revPct}%` }} className="bg-emerald-500 transition-all duration-500"></div>
                <div style={{ width: `${expPct}%` }} className="bg-rose-500 transition-all duration-500"></div>
              </div>
            </div>

          {/* Quick Links */}
          <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-5">
            <QuickLink to="/pc-entries" icon={Boxes} title="Raw Material" subtitle="Daily PC entries · money out" color="from-sky-500/20 to-blue-500/20 text-sky-500" />
            <QuickLink to="/sells" icon={ShoppingCart} title="Sells" subtitle="Sell stock · money in" color="from-emerald-500/20 to-teal-500/20 text-emerald-500" />
            <QuickLink to="/maintenance" icon={ReceiptText} title="Maintenance" subtitle="Petrol · Operator · Other" color="from-amber-500/20 to-orange-500/20 text-amber-500" />
            <QuickLink to="/reports" icon={BarChart3} title="Reports" subtitle="Charts and analytics" color="from-indigo-500/20 to-purple-500/20 text-indigo-500" />
            <QuickLink to="/history" icon={History} title="History" subtitle="Device & location log" color="from-slate-500/20 to-zinc-500/20 text-slate-500" />
          </div>

          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button variant="outline" onClick={() => handleExport("excel")} className="text-xs">
              <Download className="h-3.5 w-3.5" /> Excel Export
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")} className="text-xs">
              <Download className="h-3.5 w-3.5" /> PDF Export
            </Button>
          </div>

          <AuditLogPanel logs={auditLogs.slice(0, 8)} sells={sells} expenses={expenses} rawMaterials={pcEntries as any} />

            <ExportDialog
              open={exportOpen}
              onOpenChange={setExportOpen}
              defaultFormat={exportFormat}
              rawMaterials={pcEntries}
              sells={sells}
              expenses={expenses}
              settings={settings}
              totalStock={totalStock}
              effectiveMoney={effectiveMoney}
            />
          </div>
        );
      }}
    </ERPPageFrame>
  );
}

function QuickLink({ to, icon: Icon, title, subtitle, color }: { to: "/pc-entries" | "/sells" | "/maintenance" | "/reports" | "/history"; icon: typeof Boxes; title: string; subtitle: string; color?: string }) {
  return (
    <Link to={to} className="group rounded-xl border bg-card/90 backdrop-blur-sm p-3.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card hover:border-primary/40">
      <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color || "from-primary/20 to-primary/10 text-primary"}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h2 className="text-xs sm:text-sm font-semibold truncate text-foreground">{title}</h2>
      <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
    </Link>
  );
}
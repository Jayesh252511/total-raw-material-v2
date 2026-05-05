import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Download, History, ReceiptText } from "lucide-react";
import { AuditLogPanel } from "@/components/erp/AuditLogPanel";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF } from "@/lib/exporters";

export const Route = createFileRoute("/")({
  component: ERPDashboard,
  head: () => ({
    meta: [
      { title: "Ledger ERP — Inventory Dashboard" },
      { name: "description", content: "Mobile-friendly ERP dashboard for raw material stock, maintenance expenses, reports, and live history." },
    ],
  }),
});

function ERPDashboard() {
  return (
    <ERPPageFrame>
      {({ rawMaterials, expenses, settings, auditLogs, totalStock }) => (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink to="/raw-material" icon={Boxes} title="Raw Material" subtitle="Add stock, rates, and tons" />
            <QuickLink to="/maintenance" icon={ReceiptText} title="Maintenance" subtitle="Track daily expenses" />
            <QuickLink to="/reports" icon={BarChart3} title="Reports" subtitle="Charts and analytics" />
            <QuickLink to="/history" icon={History} title="History" subtitle="Device and location log" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Button variant="outline" onClick={() => exportToExcel(rawMaterials, expenses, settings, totalStock)}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(rawMaterials, expenses, settings, totalStock)}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
          <AuditLogPanel logs={auditLogs.slice(0, 8)} />
        </div>
      )}
    </ERPPageFrame>
  );
}

function QuickLink({ to, icon: Icon, title, subtitle }: { to: "/raw-material" | "/maintenance" | "/reports" | "/history"; icon: typeof Boxes; title: string; subtitle: string }) {
  return (
    <Link to={to} className="group rounded-xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </Link>
  );
}
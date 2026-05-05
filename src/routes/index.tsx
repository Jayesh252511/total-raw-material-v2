import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERPData } from "@/lib/erpStore";
import { useAuth } from "@/lib/auth";
import { isToday, isThisMonth } from "@/lib/format";
import { SummaryCards } from "@/components/erp/SummaryCards";
import { RawMaterialsTable } from "@/components/erp/RawMaterialsTable";
import { ExpensesTable } from "@/components/erp/ExpensesTable";
import { ReportsPanel } from "@/components/erp/ReportsPanel";
import { AuditLogPanel } from "@/components/erp/AuditLogPanel";
import { AlertsBar } from "@/components/erp/AlertsBar";
import { SettingsDialog } from "@/components/erp/SettingsDialog";
import { AuthButton } from "@/components/erp/AuthButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportToExcel, exportToPDF } from "@/lib/exporters";
import { Toaster } from "@/components/ui/sonner";
import { BarChart3, Download, FileSpreadsheet, FileText, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  component: ERPApp,
  head: () => ({
    meta: [
      { title: "Ledger ERP — Inventory & Expense Management" },
      { name: "description", content: "Spreadsheet-style ERP dashboard for tracking money, raw material stock in tons, expenses, and analytics." },
    ],
  }),
});

function ERPApp() {
  const { rawMaterials, expenses, settings, auditLogs, totalStock, loading } = useERPData();
  const [role, setRole] = useRole();
  const readOnly = role === "viewer";
  const [tab, setTab] = useState("workspace");

  const stats = useMemo(() => {
    const todayMaint = expenses.filter((e) => isToday(e.entry_date)).reduce((s, e) => s + Number(e.amount), 0);
    const monthMaint = expenses.filter((e) => isThisMonth(e.entry_date)).reduce((s, e) => s + Number(e.amount), 0);
    const todayRM = rawMaterials.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.total_amount), 0);
    const monthRM = rawMaterials.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.total_amount), 0);
    const todayTons = rawMaterials.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.quantity), 0);
    const monthTons = rawMaterials.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.quantity), 0);
    return {
      totalMoney: settings.total_money,
      totalStock,
      todayExpense: todayMaint + todayRM,
      monthExpense: monthMaint + monthRM,
      todayTons,
      monthTons,
      todayMaint,
      monthMaint,
    };
  }, [rawMaterials, expenses, settings, totalStock]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">Ledger ERP</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Inventory · Expenses · Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitch role={role} setRole={setRole} />
            <SettingsDialog settings={settings} disabled={readOnly} />
            <Button variant="outline" size="sm" onClick={() => exportToExcel(rawMaterials, expenses, settings, totalStock)} className="h-8 hidden sm:inline-flex">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToPDF(rawMaterials, expenses, settings, totalStock)} className="h-8 hidden sm:inline-flex">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
            <Button size="sm" onClick={() => setTab("reports")} className="h-8">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Reports
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 sm:px-6 py-5 space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <SummaryCards {...stats} />
        )}

        <AlertsBar settings={settings} totalStock={totalStock} rawMaterials={rawMaterials} expenses={expenses} />

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-card border shadow-soft">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="space-y-4 m-0">
            <RawMaterialsTable rows={rawMaterials} readOnly={readOnly} />
            <ExpensesTable rows={expenses} readOnly={readOnly} />

            <div className="flex sm:hidden gap-2">
              <Button variant="outline" className="flex-1" onClick={() => exportToExcel(rawMaterials, expenses, settings, totalStock)}>
                <Download className="h-4 w-4 mr-2" /> Excel
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => exportToPDF(rawMaterials, expenses, settings, totalStock)}>
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="m-0">
            <ReportsPanel rawMaterials={rawMaterials} expenses={expenses} />
          </TabsContent>

          <TabsContent value="audit" className="m-0">
            <AuditLogPanel logs={auditLogs} />
          </TabsContent>
        </Tabs>

        <footer className="pt-4 pb-8 text-center text-[11px] text-muted-foreground">
          Ledger ERP · Real-time sync · Spreadsheet-style editing
        </footer>
      </main>
    </div>
  );
}

function RoleSwitch({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs">
      <button onClick={() => setRole("admin")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${role === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        <ShieldCheck className="h-3 w-3" /> Admin
      </button>
      <button onClick={() => setRole("viewer")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${role === "viewer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        <Eye className="h-3 w-3" /> Viewer
      </button>
    </div>
  );
}

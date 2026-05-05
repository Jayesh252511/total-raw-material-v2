import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Boxes, FileSpreadsheet, FileText, Home, Layers, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/erp/AuthButton";
import { SettingsDialog } from "@/components/erp/SettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import type { Expense, RawMaterial, Settings } from "@/lib/erpStore";
import { exportToExcel, exportToPDF } from "@/lib/exporters";

type Props = {
  children: React.ReactNode;
  settings: Settings;
  readOnly: boolean;
  rawMaterials: RawMaterial[];
  expenses: Expense[];
  totalStock: number;
};

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/raw-material", label: "Raw", icon: Boxes },
  { to: "/maintenance", label: "Maintenance", icon: ReceiptText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AppShell({ children, settings, readOnly, rawMaterials, expenses, totalStock }: Props) {
  const pathname = useLocation({ select: (s) => s.pathname });
  return (
    <div className="min-h-screen bg-background pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-none tracking-tight">Ledger ERP</h1>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">Inventory · Expenses · Analytics</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 rounded-lg border bg-card p-1 shadow-soft lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Button key={item.to} asChild variant={active ? "default" : "ghost"} size="sm" className="h-8">
                  <Link to={item.to}><Icon className="h-3.5 w-3.5" />{item.label}</Link>
                </Button>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <AuthButton />
            <SettingsDialog settings={settings} disabled={readOnly} />
            <Button variant="outline" size="sm" onClick={() => exportToExcel(rawMaterials, expenses, settings, totalStock)} className="hidden h-8 md:inline-flex">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToPDF(rawMaterials, expenses, settings, totalStock)} className="hidden h-8 md:inline-flex">
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] space-y-5 px-3 py-4 sm:px-6 sm:py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-elevated backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
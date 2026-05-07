import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Boxes, FileSpreadsheet, FileText, Home, Layers, ReceiptText, ShoppingCart, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/erp/AuthButton";
import { SettingsDialog } from "@/components/erp/SettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Expense, RawMaterial, Settings } from "@/lib/erpStore";
import { exportToExcel, exportToPDF } from "@/lib/exporters";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { fmtINR } from "@/lib/format";

type Props = {
  children: React.ReactNode;
  settings: Settings;
  readOnly: boolean;
  rawMaterials: RawMaterial[];
  expenses: Expense[];
  totalStock: number;
};

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/pc-entries", label: "Raw", icon: Boxes },
  { to: "/sells", label: "Sells", icon: ShoppingCart },
  { to: "/maintenance", label: "Maint.", icon: ReceiptText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

function AddMoneyDialog({ currentMoney, disabled }: { currentMoney: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  async function add() {
    const n = Number(amt) || 0;
    if (n === 0) return;
    const next = currentMoney + n;
    const { error } = await supabase.from("settings").update({ total_money: next }).eq("id", 1);
    if (error) return toast.error(error.message);
    await logAudit("settings_changed", "settings", "1", { added_money: n, note, before: currentMoney, after: next });
    toast.success(`Added ${fmtINR(n)} to total money`);
    setAmt(""); setNote(""); setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-8 gap-1">
          <Wallet className="h-3.5 w-3.5" /><Plus className="h-3 w-3" /><span className="hidden sm:inline">Money</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add money to total</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">Current: <span className="font-semibold">{fmtINR(currentMoney)}</span></p>
          <div><Label className="text-xs">Amount (₹)</Label><Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="e.g. 5000" autoFocus /></div>
          <div><Label className="text-xs">Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash deposit, advance to worker..." /></div>
          {amt && <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">New total: <span className="font-semibold tabular-nums">{fmtINR(currentMoney + (Number(amt) || 0))}</span></p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
              <p className="truncate text-[11px] leading-tight text-muted-foreground">Inventory · Sells · Expenses</p>
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
            <AddMoneyDialog currentMoney={settings.total_money} disabled={readOnly} />
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
        <div className="grid grid-cols-5 gap-1">
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

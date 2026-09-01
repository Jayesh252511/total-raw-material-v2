import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Boxes, FileSpreadsheet, FileText, Home, Layers, Lock, ReceiptText, ShoppingCart, Wallet, Plus, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/erp/AuthButton";
import { SettingsDialog } from "@/components/erp/SettingsDialog";
import { MoneyHistoryDialog } from "@/components/erp/MoneyHistoryDialog";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Expense, PcEntry, Sell, Settings } from "@/lib/erpStore";
import { ExportDialog } from "@/components/erp/ExportDialog";
import { CommandPalette } from "@/components/erp/CommandPalette";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { fmtINR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  settings: Settings;
  effectiveMoney: number;
  readOnly: boolean;
  rawMaterials: PcEntry[];
  sells: Sell[];
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

function AddFundsDialog({ currentMoney, effectiveMoney, currentLock, disabled }: { currentMoney: number; effectiveMoney: number; currentLock: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  async function add() {
    const n = Number(amt) || 0;
    if (n === 0) return;
    const nextTotal = currentMoney + n;
    const nextLock = currentLock + n;
    
    const { error } = await supabase.from("settings").update({ 
      total_money: nextTotal, 
      lock_money: nextLock 
    }).eq("id", 1);
    
    if (error) return toast.error(error.message);
    
    await logAudit("settings_changed", "settings", "1", { 
      added_to_lock_and_total: n, 
      note, 
      total_before: currentMoney, 
      total_after: nextTotal,
      lock_before: currentLock,
      lock_after: nextLock,
      added_money: n,
      before: currentMoney,
      after: nextTotal
    });
    
    toast.success(`Added ${fmtINR(n)} to funds`);
    setAmt(""); setNote(""); setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-8 gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20">
          <Wallet className="h-3.5 w-3.5" /><Plus className="h-3 w-3" /><span>Add Funds</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Funds</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">This will add money to both Total and Lock balances.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/40 p-2 text-center">
              <span className="block text-[10px] text-muted-foreground uppercase">Base Total Money</span>
              <span className="font-semibold text-sm">{fmtINR(currentMoney)}</span>
            </div>
            <div className="rounded-md bg-muted/40 p-2 text-center">
              <span className="block text-[10px] text-muted-foreground uppercase">Lock Amount</span>
              <span className="font-semibold text-sm">{fmtINR(currentLock)}</span>
            </div>
          </div>
          <div className="rounded-md bg-primary/5 p-2 text-center border border-primary/10">
            <span className="block text-[10px] text-primary uppercase font-semibold">Net Total Money (Available)</span>
            <span className="font-bold text-sm text-primary tabular-nums">{fmtINR(effectiveMoney)}</span>
          </div>
          <div><Label className="text-xs">Amount to Add (₹)</Label><Input type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="e.g. 5000" autoFocus /></div>
          <div><Label className="text-xs">Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash deposit, source..." /></div>
          {amt && (
            <div className="rounded-md bg-primary/5 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>New Total:</span><span className="font-bold tabular-nums">{fmtINR(currentMoney + (Number(amt) || 0))}</span></div>
              <div className="flex justify-between"><span>New Lock:</span><span className="font-bold tabular-nums">{fmtINR(currentLock + (Number(amt) || 0))}</span></div>
              <div className="flex justify-between text-primary font-semibold"><span>New Net Available:</span><span className="font-bold tabular-nums">{fmtINR(effectiveMoney + (Number(amt) || 0))}</span></div>
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Confirm Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== "undefined") {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={toggle} className="h-8 w-8 rounded-lg border-border/60 hover:bg-accent" title="Toggle Light/Dark Theme">
      {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
    </Button>
  );
}

export function AppShell({ children, settings, effectiveMoney, readOnly, rawMaterials, sells, expenses, totalStock }: Props) {
  const pathname = useLocation({ select: (s) => s.pathname });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("pdf");
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleExport = (fmt: "excel" | "pdf") => {
    setExportFormat(fmt);
    setExportOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0 transition-colors duration-300 relative overflow-x-hidden">
      <Toaster richColors position="top-right" />

      {/* Floating Ambient Background Neon Mesh Orbs (Dark Mode) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 dark:opacity-40">
        <div className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute top-1/2 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-500/20 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-3 sm:px-6 relative z-10">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground shadow-soft">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-none tracking-tight">Ledger ERP</h1>
                <p className="truncate text-[11px] leading-tight text-muted-foreground">Inventory · Sells · Expenses</p>
              </div>
            </Link>
            <a href="https://total-raw-material-v2.onrender.com" target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>24/7 Cloud Bot</span>
            </a>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-1 shadow-soft md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setCmdOpen(true)} className="hidden sm:flex items-center gap-2 h-8 rounded-lg border-border/60 text-xs text-muted-foreground hover:text-foreground">
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="font-mono text-[10px] bg-muted px-1 rounded border">Ctrl K</kbd>
            </Button>
            <AddFundsDialog currentMoney={settings.total_money} effectiveMoney={effectiveMoney} currentLock={settings.lock_money} disabled={readOnly} />
            <ThemeToggle />
            <AuthButton />
            <SettingsDialog settings={settings} effectiveMoney={effectiveMoney} disabled={readOnly} />
            <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="hidden h-8 md:inline-flex rounded-lg">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="hidden h-8 md:inline-flex rounded-lg">
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] space-y-5 px-3 py-4 sm:px-6 sm:py-5 relative z-10">{children}</main>
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

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} rawMaterials={rawMaterials} sells={sells} expenses={expenses} />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultFormat={exportFormat}
        rawMaterials={rawMaterials}
        sells={sells}
        expenses={expenses}
        settings={settings}
        totalStock={totalStock}
        effectiveMoney={effectiveMoney}
      />
    </div>
  );
}

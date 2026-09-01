import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, Home, Boxes, ShoppingCart, ReceiptText, BarChart3, Wallet, FileText, FileSpreadsheet, Moon, Sun, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { PcEntry, Sell, Expense } from "@/lib/erpStore";
import { fmtINR } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawMaterials?: PcEntry[];
  sells?: Sell[];
  expenses?: Expense[];
  onAddFundsClick?: () => void;
};

export function CommandPalette({ open, onOpenChange, rawMaterials = [], sells = [], expenses = [], onAddFundsClick }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="w-full max-w-xl px-4">
        <Command className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-popover-foreground shadow-2xl backdrop-blur-xl">
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search party (e.g. Mahesh, Jayesh)..."
              className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No matching commands or parties found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/" }))}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Home className="h-4 w-4 text-primary" />
                  <span>Go to Home Dashboard</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/pc-entries" }))}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="h-4 w-4 text-sky-500" />
                  <span>Go to Raw Material Ledger</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/sells" }))}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />
                  <span>Go to Sells Ledger</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/maintenance" }))}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ReceiptText className="h-4 w-4 text-amber-500" />
                  <span>Go to Maintenance & Expenses</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate({ to: "/reports" }))}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span>Go to Reports & Analytics</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              </Command.Item>
            </Command.Group>

            {/* Sells Parties */}
            {sells.length > 0 && (
              <Command.Group heading="Recent Sells Parties" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                {sells.slice(0, 5).map((s) => (
                  <Command.Item
                    key={`sell-${s.id}`}
                    onSelect={() => runCommand(() => navigate({ to: "/sells" }))}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                        {(s.name || "—").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium">{s.name || "Unnamed Party"}</span>
                      <span className="text-xs text-muted-foreground">· #{s.serial_number}</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {fmtINR((Number(s.quantity) || 0) * (Number(s.rate) || 0))}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

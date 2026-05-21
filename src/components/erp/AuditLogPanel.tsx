import { useState, useMemo } from "react";
import type { AuditLog, Sell, Expense, RawMaterial } from "@/lib/erpStore";
import { History, MapPin, MonitorSmartphone, Plus, Pencil, Trash2, Settings as SettingsIcon, Calendar, User, FileText, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR, fmtNum } from "@/lib/format";

const iconMap = {
  created: { icon: Plus, cls: "text-success bg-success/10" },
  updated: { icon: Pencil, cls: "text-info bg-info/10" },
  deleted: { icon: Trash2, cls: "text-destructive bg-destructive/10" },
  settings_changed: { icon: SettingsIcon, cls: "text-warning bg-warning/15" },
};

// Sells invoice preview
function SellInvoicePreview({ row, highlightField }: { row: any; highlightField?: string }) {
  if (!row) return null;
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  const gb = Number(row.gadi_bhada) || 0;
  const payment = Number(row.payment) || 0;
  
  const baseCost = qty * rate;
  
  // Dynamic calculation: historical entries might have GST.
  // In sells: Total Amount = Qty * Rate. Amt w/o Gadi Bhada = Total Amount - Gadi Bhada.
  // Since SELL_GST_RATE might be removed, we just calculate raw and net values directly.
  const subtotal = baseCost; 
  const netAmount = subtotal - gb;
  const difference = payment - netAmount;

  const isHighlighted = (f: string) => highlightField === f;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-inner space-y-4 max-w-xl mx-auto font-sans text-sm text-foreground">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h4 className="text-base font-bold text-success tracking-tight">SALES INVOICE</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Pc No. #{row.serial_number || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Date of Issue</p>
          <p className="font-semibold text-xs mt-0.5">{row.entry_date || "—"}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="grid grid-cols-2 gap-4 border-b pb-3">
        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Customer Name</span>
          <span className="font-bold text-sm mt-0.5 block">{row.name || "—"}</span>
        </div>
        {row.vehicle_number && (
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Vehicle Number</span>
            <span className="font-mono font-semibold text-xs mt-0.5 block">🚚 {row.vehicle_number}</span>
          </div>
        )}
      </div>

      {/* Item Table */}
      <div className="border-b pb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase border-b text-[10px] font-semibold tracking-wider">
              <th className="text-left pb-1.5">Description</th>
              <th className="text-right pb-1.5">Qty (t)</th>
              <th className="text-right pb-1.5">Rate (₹/t)</th>
              <th className="text-right pb-1.5">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/40">
            <tr className={isHighlighted("quantity") || isHighlighted("rate") ? "bg-amber-100/40 dark:bg-amber-950/20" : "hover:bg-muted/10"}>
              <td className="py-2 font-medium">Raw Material Sale</td>
              <td className="text-right py-2 tabular-nums">{fmtNum(qty, 3)}</td>
              <td className="text-right py-2 tabular-nums">{fmtNum(rate, 2)}</td>
              <td className="text-right py-2 tabular-nums font-semibold">{fmtINR(baseCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Calculations */}
      <div className="space-y-1.5 text-xs text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal Amount:</span>
          <span className="font-semibold tabular-nums">{fmtINR(subtotal)}</span>
        </div>
        <div className={`flex justify-between py-1 px-2 rounded ${isHighlighted("gadi_bhada") ? "bg-amber-100 dark:bg-amber-950/40 border border-amber-300" : ""}`}>
          <span className="text-muted-foreground">Gadi Bhada (Flat Deduction):</span>
          <span className="font-semibold tabular-nums text-destructive">- {fmtINR(gb)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 text-sm">
          <span className="font-bold text-foreground">Amt w/o Gadi Bhada:</span>
          <span className="font-bold text-success tabular-nums">{fmtINR(netAmount)}</span>
        </div>
        <div className={`flex justify-between py-1.5 px-2 rounded ${isHighlighted("payment") ? "bg-amber-100 dark:bg-amber-950/40 border border-amber-300 font-semibold" : ""}`}>
          <span className="text-muted-foreground font-medium">Payment Received:</span>
          <span className="font-bold text-success tabular-nums">{fmtINR(payment)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 text-sm">
          <span className="font-bold text-foreground">Difference:</span>
          <span className={`font-bold tabular-nums ${difference === 0 ? "text-success" : difference > 0 ? "text-destructive" : "text-amber-600"}`}>
            {fmtINR(difference)}
          </span>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="border-t pt-2.5 text-[10px] text-muted-foreground flex justify-between items-center">
        <span>Sells Ledger Document</span>
        <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase ${difference === 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : difference > 0 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
          {difference === 0 ? "Balanced" : difference > 0 ? "Due (Remaining)" : "Payment Short"}
        </span>
      </div>
    </div>
  );
}

// Purchase receipt preview
function RawMaterialReceiptPreview({ row, highlightField }: { row: any; highlightField?: string }) {
  if (!row) return null;
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  const payment = Number(row.payment) || 0;
  const total = qty * rate;
  const difference = total - payment;

  const isHighlighted = (f: string) => highlightField === f;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-inner space-y-4 max-w-xl mx-auto font-sans text-sm text-foreground">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h4 className="text-base font-bold text-primary tracking-tight">PURCHASE RECEIPT</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Pc No. #{row.serial_number || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Date of Entry</p>
          <p className="font-semibold text-xs mt-0.5">{row.entry_date || "—"}</p>
        </div>
      </div>

      {/* Supplier */}
      <div className="border-b pb-3">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Supplier Name</span>
        <span className="font-bold text-sm mt-0.5 block">{row.name || "—"}</span>
      </div>

      {/* Item Table */}
      <div className="border-b pb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase border-b text-[10px] font-semibold tracking-wider">
              <th className="text-left pb-1.5">Description</th>
              <th className="text-right pb-1.5">Qty (t)</th>
              <th className="text-right pb-1.5">Rate (₹/t)</th>
              <th className="text-right pb-1.5">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/40">
            <tr className={isHighlighted("quantity") || isHighlighted("rate") ? "bg-amber-100/40 dark:bg-amber-950/20" : "hover:bg-muted/10"}>
              <td className="py-2 font-medium">Raw Material Purchase</td>
              <td className="text-right py-2 tabular-nums">{fmtNum(qty, 3)}</td>
              <td className="text-right py-2 tabular-nums">{fmtNum(rate, 2)}</td>
              <td className="text-right py-2 tabular-nums font-semibold">{fmtINR(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="space-y-1.5 text-xs text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground font-medium">Total Amount:</span>
          <span className="font-bold text-foreground tabular-nums">{fmtINR(total)}</span>
        </div>
        <div className={`flex justify-between py-1.5 px-2 rounded ${isHighlighted("payment") ? "bg-amber-100 dark:bg-amber-950/40 border border-amber-300 font-semibold" : ""}`}>
          <span className="text-muted-foreground font-medium">Payment Made:</span>
          <span className="font-bold text-success tabular-nums">{fmtINR(payment)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 text-sm">
          <span className="font-bold text-foreground">Difference (Owed):</span>
          <span className={`font-bold tabular-nums ${difference === 0 ? "text-success" : "text-amber-600"}`}>
            {fmtINR(difference)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-2.5 text-[10px] text-muted-foreground flex justify-between items-center">
        <span>Raw Material Ledger Record</span>
        <span className={`px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase ${difference === 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
          {difference === 0 ? "Paid In Full" : "Pending Balance"}
        </span>
      </div>
    </div>
  );
}

// Expense voucher preview
function ExpenseVoucherPreview({ row, highlightField }: { row: any; highlightField?: string }) {
  if (!row) return null;
  const amt = Number(row.amount) || 0;
  
  const isHighlighted = (f: string) => highlightField === f;
  const categoryLabel = row.category === "petrol_diesel" ? "Petrol & Diesel" : row.category === "operator" ? "Operator Salary" : "Other Maintenance";

  return (
    <div className="rounded-xl border bg-card p-5 shadow-inner space-y-4 max-w-xl mx-auto font-sans text-sm text-foreground">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h4 className="text-base font-bold text-warning tracking-tight">PAYMENT VOUCHER</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Voucher No. #{row.serial_number || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Date of Expense</p>
          <p className="font-semibold text-xs mt-0.5">{row.entry_date || "—"}</p>
        </div>
      </div>

      {/* Category & Details */}
      <div className="grid grid-cols-2 gap-4 border-b pb-3">
        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Expense Category</span>
          <span className="font-bold text-xs mt-0.5 block text-primary">{categoryLabel}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Paid To / Description</span>
          <span className="font-semibold text-xs mt-0.5 block">{row.name || "—"}</span>
        </div>
      </div>

      {/* Amount Card */}
      <div className={`rounded-lg bg-muted/40 p-4 flex justify-between items-center ${isHighlighted("amount") ? "bg-amber-100 dark:bg-amber-950/40 border border-amber-300" : ""}`}>
        <span className="font-semibold text-muted-foreground text-xs uppercase">Amount Approved & Paid</span>
        <span className="font-extrabold text-sm text-destructive tabular-nums">{fmtINR(amt)}</span>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-muted-foreground text-center">
        Authorized Ledger Maintenance Transaction
      </div>
    </div>
  );
}

// Settings changelog preview
function SettingsChangelogPreview({ details }: { details: any }) {
  if (!details) return null;
  const before = details.before || {};
  const after = details.after || {};
  const keys = Object.keys(after);

  const formatKeyName = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-inner space-y-4 max-w-xl mx-auto font-sans text-sm text-foreground">
      <h4 className="text-base font-bold text-warning border-b pb-2 tracking-tight">SETTINGS CHANGELOG</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase border-b text-[10px] font-semibold tracking-wider">
              <th className="text-left pb-1.5">Setting Name</th>
              <th className="text-right pb-1.5">Old Value</th>
              <th className="text-right pb-1.5">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/40">
            {keys.map((key) => {
              const valBefore = before[key] !== undefined ? before[key] : "—";
              const valAfter = after[key] !== undefined ? after[key] : "—";
              
              const isMoney = key.includes("money") || key.includes("threshold") || key.includes("amount") || key.includes("adjustment");
              const formatVal = (v: any) => {
                if (v === "—") return "—";
                return isMoney ? fmtINR(Number(v)) : String(v);
              };

              return (
                <tr key={key} className="hover:bg-muted/10">
                  <td className="py-2.5 font-medium">{formatKeyName(key)}</td>
                  <td className="text-right py-2.5 tabular-nums text-muted-foreground font-mono">{formatVal(valBefore)}</td>
                  <td className="text-right py-2.5 tabular-nums font-semibold font-mono text-primary">{formatVal(valAfter)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fallback update field display
function UpdateSummaryPanel({ details, entity, entityId }: { details: any; entity: string; entityId: string | null }) {
  if (!details) return null;
  const field = details.field || "—";
  const before = details.before?.[field] !== undefined ? details.before[field] : (details.before !== undefined ? details.before : "—");
  const after = details.after?.[field] !== undefined ? details.after[field] : (details.after !== undefined ? details.after : "—");

  const formatFieldName = (f: string) => {
    return f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isMoney = field.includes("payment") || field.includes("rate") || field.includes("amount") || field.includes("gadi_bhada");
  const formatVal = (v: any) => {
    if (v === "—" || v === null || v === undefined) return "—";
    return isMoney ? fmtINR(Number(v)) : String(v);
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-inner space-y-4 max-w-xl mx-auto font-sans text-sm text-foreground">
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-200">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
        <span className="text-xs font-semibold">Row Deleted from Active Database</span>
      </div>
      <p className="text-xs text-muted-foreground">
        This entry (ID: <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono">{entityId}</code>) was updated in the past, but has since been deleted. The field change logged is:
      </p>
      <div className="grid grid-cols-2 gap-4 pt-2 text-center">
        <div className="bg-muted/40 p-3 rounded-lg border">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Old {formatFieldName(field)}</span>
          <span className="font-bold text-sm tabular-nums text-muted-foreground font-mono">{formatVal(before)}</span>
        </div>
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
          <span className="text-[10px] uppercase font-bold text-primary block mb-1">New {formatFieldName(field)}</span>
          <span className="font-extrabold text-sm tabular-nums text-primary font-mono">{formatVal(after)}</span>
        </div>
      </div>
    </div>
  );
}

export function AuditLogPanel({
  logs,
  sells = [],
  expenses = [],
  rawMaterials = [],
}: {
  logs: AuditLog[];
  sells?: Sell[];
  expenses?: Expense[];
  rawMaterials?: RawMaterial[];
}) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Lookup function for the modified/deleted row
  const rowData = useMemo(() => {
    if (!selectedLog) return null;
    const { action, entity, entity_id, details } = selectedLog;

    // 1. If row is saved directly in details (created, deleted, or future updates)
    if (details && typeof details === "object") {
      if ("row" in details && details.row) {
        return details.row;
      }
    }

    // 2. Perform active database local lookups for updates
    if (action === "updated" && entity_id) {
      if (entity === "sells") {
        return sells.find((s) => s.id === entity_id) || null;
      }
      if (entity === "raw_materials" || entity === "raw_material") {
        return rawMaterials.find((r) => r.id === entity_id) || null;
      }
      if (entity === "expense" || entity === "expenses") {
        return expenses.find((e) => e.id === entity_id) || null;
      }
    }

    return null;
  }, [selectedLog, sells, expenses, rawMaterials]);

  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Audit Log</h3>
        <span className="text-xs text-muted-foreground">· latest 200 events</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y">
        {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No activity yet.</p>}
        {logs.map((log) => {
          const def = iconMap[log.action as keyof typeof iconMap] ?? iconMap.updated;
          const Icon = def.icon;
          return (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer active:bg-muted/40"
              title="Click to view full details"
            >
              <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md ${def.cls}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium capitalize">{log.action.replace("_", " ")}</span>{" "}
                  <span className="text-muted-foreground">{log.entity.replace("_", " ")}</span>
                  {log.details && typeof log.details === "object" && "field" in log.details && (
                    <span className="text-muted-foreground"> · {String((log.details as { field: string }).field)}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{new Date(log.created_at).toLocaleString("en-IN")}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {log.device_info && (
                    <span className="inline-flex items-center gap-1"><MonitorSmartphone className="h-3 w-3" />{log.device_info}</span>
                  )}
                  {log.location_info && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{log.location_info}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Log Item Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>Event Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              {/* Event Metadata Banner */}
              <div className="rounded-xl border bg-muted/20 p-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-muted pb-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      selectedLog.action === "created" ? "bg-emerald-500" :
                      selectedLog.action === "deleted" ? "bg-destructive" :
                      selectedLog.action === "updated" ? "bg-info" : "bg-warning"
                    }`} />
                    <span className="capitalize">{selectedLog.action.replace("_", " ")}</span> {selectedLog.entity.replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {new Date(selectedLog.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  {selectedLog.device_info && (
                    <div className="flex items-center gap-1.5">
                      <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedLog.device_info}</span>
                    </div>
                  )}
                  {selectedLog.location_info && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedLog.location_info}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Show Update Banner if field was updated */}
              {selectedLog.action === "updated" && selectedLog.details && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-950/40 dark:bg-blue-950/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-400">
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Field Modified</span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    The field <strong className="font-semibold uppercase tracking-wider text-[11px] bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">{String(selectedLog.details.field)}</strong> was updated in this transaction.
                  </p>
                  {rowData && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      (See highlighted cell in invoice/receipt preview below)
                    </p>
                  )}
                </div>
              )}

              {/* Render Beautiful Document View based on Entity */}
              <div className="pt-2">
                {selectedLog.entity === "settings" ? (
                  <SettingsChangelogPreview details={selectedLog.details} />
                ) : rowData ? (
                  // We have the full row! Render receipt templates
                  selectedLog.entity === "sells" ? (
                    <SellInvoicePreview
                      row={rowData}
                      highlightField={selectedLog.action === "updated" ? String(selectedLog.details?.field) : undefined}
                    />
                  ) : selectedLog.entity === "raw_materials" || selectedLog.entity === "raw_material" ? (
                    <RawMaterialReceiptPreview
                      row={rowData}
                      highlightField={selectedLog.action === "updated" ? String(selectedLog.details?.field) : undefined}
                    />
                  ) : selectedLog.entity === "expense" || selectedLog.entity === "expenses" ? (
                    <ExpenseVoucherPreview
                      row={rowData}
                      highlightField={selectedLog.action === "updated" ? String(selectedLog.details?.field) : undefined}
                    />
                  ) : (
                    // Fallback JSON dump for unexpected entities
                    <pre className="text-xs font-mono bg-muted p-4 rounded-xl overflow-x-auto max-h-60">
                      {JSON.stringify(rowData, null, 2)}
                    </pre>
                  )
                ) : selectedLog.action === "updated" && selectedLog.details ? (
                  // Update log without full row data (historical deleted items)
                  <UpdateSummaryPanel
                    details={selectedLog.details}
                    entity={selectedLog.entity}
                    entityId={selectedLog.entity_id}
                  />
                ) : (
                  // Fallback for logs without row details (e.g. settings or ancient logs)
                  <div className="text-center py-6 text-muted-foreground text-xs space-y-1.5">
                    <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p>No full document details are stored in this record.</p>
                    <pre className="text-[10px] text-left font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-40 mt-3">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

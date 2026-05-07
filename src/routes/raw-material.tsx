import { createFileRoute, Link } from "@tanstack/react-router";
import { LedgerTable } from "@/components/erp/LedgerTable";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/raw-material")({
  component: RawMaterialPage,
  head: () => ({
    meta: [
      { title: "Raw Material Sheet — Ledger ERP" },
      { name: "description", content: "Raw material purchases. Stock added, money deducted by payment." },
    ],
  }),
});

function RawMaterialPage() {
  return (
    <ERPPageFrame showSummary={false}>
      {({ rawMaterials, readOnly, refresh }) => (
        <div className="space-y-3">
          <Link
            to="/pc-entries"
            className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Daily PC Entries</p>
                <p className="text-xs text-muted-foreground">Live mirror from external system · view only</p>
              </div>
            </div>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Live</span>
          </Link>
          <LedgerTable mode="purchase" rows={rawMaterials} readOnly={readOnly} onChanged={refresh} />
        </div>
      )}
    </ERPPageFrame>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { LedgerTable } from "@/components/erp/LedgerTable";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";

export const Route = createFileRoute("/sells")({
  component: SellsPage,
  head: () => ({
    meta: [
      { title: "Sells Sheet — Ledger ERP" },
      { name: "description", content: "Sells ledger. Stock reduced, money credited by payment." },
    ],
  }),
});

function SellsPage() {
  return (
    <ERPPageFrame showSummary={false}>
      {({ sells, readOnly, refresh }) => <LedgerTable mode="sell" rows={sells} readOnly={readOnly} onChanged={refresh} />}
    </ERPPageFrame>
  );
}

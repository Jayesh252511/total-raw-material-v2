import { createFileRoute } from "@tanstack/react-router";
import { LedgerTable } from "@/components/erp/LedgerTable";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";

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
      {({ rawMaterials, readOnly, refresh }) => <LedgerTable mode="purchase" rows={rawMaterials} readOnly={readOnly} onChanged={refresh} />}
    </ERPPageFrame>
  );
}

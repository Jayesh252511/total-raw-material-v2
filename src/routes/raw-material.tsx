import { createFileRoute } from "@tanstack/react-router";
import { RawMaterialsTable } from "@/components/erp/RawMaterialsTable";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";

export const Route = createFileRoute("/raw-material")({
  component: RawMaterialPage,
  head: () => ({
    meta: [
      { title: "Raw Material Sheet — Ledger ERP" },
      { name: "description", content: "Mobile-friendly raw material sheet for stock in tons, rates, totals, and live updates." },
    ],
  }),
});

function RawMaterialPage() {
  return (
    <ERPPageFrame showSummary={false}>
      {({ rawMaterials, readOnly, refresh }) => <RawMaterialsTable rows={rawMaterials} readOnly={readOnly} onChanged={refresh} />}
    </ERPPageFrame>
  );
}
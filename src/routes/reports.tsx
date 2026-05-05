import { createFileRoute } from "@tanstack/react-router";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";
import { ReportsPanel } from "@/components/erp/ReportsPanel";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Reports — Ledger ERP" },
      { name: "description", content: "Inventory and maintenance analytics with modern charts for Ledger ERP." },
    ],
  }),
});

function ReportsPage() {
  return (
    <ERPPageFrame showSummary={false}>
      {({ rawMaterials, expenses }) => <ReportsPanel rawMaterials={rawMaterials} expenses={expenses} />}
    </ERPPageFrame>
  );
}
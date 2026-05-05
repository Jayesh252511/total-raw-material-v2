import { createFileRoute } from "@tanstack/react-router";
import { ExpensesTable } from "@/components/erp/ExpensesTable";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";

export const Route = createFileRoute("/maintenance")({
  component: MaintenancePage,
  head: () => ({
    meta: [
      { title: "Maintenance Sheet — Ledger ERP" },
      { name: "description", content: "Mobile-friendly maintenance expense sheet with search, date filters, and live updates." },
    ],
  }),
});

function MaintenancePage() {
  return (
    <ERPPageFrame showSummary={false}>
      {({ expenses, readOnly, refresh }) => <ExpensesTable rows={expenses} readOnly={readOnly} onChanged={refresh} />}
    </ERPPageFrame>
  );
}
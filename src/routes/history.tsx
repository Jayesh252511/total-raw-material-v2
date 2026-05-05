import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPanel } from "@/components/erp/AuditLogPanel";
import { ERPPageFrame } from "@/components/erp/ERPPageFrame";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "History — Ledger ERP" },
      { name: "description", content: "Audit history showing edits, entries, device information, and location context." },
    ],
  }),
});

function HistoryPage() {
  return (
    <ERPPageFrame showSummary={false} showAlerts={false}>
      {({ auditLogs }) => <AuditLogPanel logs={auditLogs} />}
    </ERPPageFrame>
  );
}
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RawMaterial, Expense, Settings } from "@/lib/erpStore";
import { fmtINR, todayStr } from "@/lib/format";

export function exportToExcel(rm: RawMaterial[], ex: Expense[], settings: Settings, totalStock: number) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ["ERP Summary Report", ""],
    ["Generated", new Date().toLocaleString("en-IN")],
    [""],
    ["Total Money Available", Number(settings.total_money)],
    ["Total Stock (tons)", totalStock],
    ["Stock Adjustment (tons)", Number(settings.stock_adjustment)],
    ["Total Raw Material Entries", rm.length],
    ["Total Expense Entries", ex.length],
    ["Total Raw Material Spend", rm.reduce((s, r) => s + Number(r.total_amount), 0)],
    ["Total Maintenance Spend", ex.reduce((s, r) => s + Number(r.amount), 0)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  const rmSheet = XLSX.utils.json_to_sheet(
    rm.map((r) => ({
      "S.No": r.serial_number,
      Date: r.entry_date,
      Name: r.name,
      "Rate (₹/t)": Number(r.rate),
      "Quantity (t)": Number(r.quantity),
      "Total (₹)": Number(r.total_amount),
    })),
  );
  XLSX.utils.book_append_sheet(wb, rmSheet, "Raw Materials");

  const exSheet = XLSX.utils.json_to_sheet(
    ex.map((r) => ({
      "S.No": r.serial_number,
      Date: r.entry_date,
      "Expense Name": r.name,
      "Amount (₹)": Number(r.amount),
    })),
  );
  XLSX.utils.book_append_sheet(wb, exSheet, "Maintenance");

  XLSX.writeFile(wb, `erp-report-${todayStr()}.xlsx`);
}

export function exportToPDF(rm: RawMaterial[], ex: Expense[], settings: Settings, totalStock: number) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ERP Business Report", w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, w / 2, 25, { align: "center" });

  doc.setTextColor(20);
  autoTable(doc, {
    startY: 32,
    head: [["Metric", "Value"]],
    body: [
      ["Total Money Available", fmtINR(Number(settings.total_money))],
      ["Total Stock", `${totalStock.toFixed(3)} tons`],
      ["Stock Adjustment", `${Number(settings.stock_adjustment).toFixed(3)} tons`],
      ["Raw Material Entries", String(rm.length)],
      ["Expense Entries", String(ex.length)],
      ["Total RM Spend", fmtINR(rm.reduce((s, r) => s + Number(r.total_amount), 0))],
      ["Total Maintenance", fmtINR(ex.reduce((s, r) => s + Number(r.amount), 0))],
    ],
    theme: "grid",
    headStyles: { fillColor: [55, 48, 163], textColor: 255, fontSize: 10 },
    styles: { fontSize: 9 },
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.text("Raw Materials", 14, (doc as any).lastAutoTable.finalY + 10);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable.finalY + 13,
    head: [["#", "Date", "Name", "Rate", "Qty (t)", "Total"]],
    body: rm.map((r) => [r.serial_number, r.entry_date, r.name, fmtINR(Number(r.rate)), Number(r.quantity).toFixed(3), fmtINR(Number(r.total_amount))]),
    theme: "striped",
    headStyles: { fillColor: [55, 48, 163], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8 },
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Maintenance / Expenses", 14, 16);
  autoTable(doc, {
    startY: 19,
    head: [["#", "Date", "Expense", "Amount"]],
    body: ex.map((r) => [r.serial_number, r.entry_date, r.name, fmtINR(Number(r.amount))]),
    theme: "striped",
    headStyles: { fillColor: [55, 48, 163], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8 },
  });

  doc.save(`erp-report-${todayStr()}.pdf`);
}

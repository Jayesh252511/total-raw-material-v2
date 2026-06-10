import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PcEntry, Expense, Sell, Settings } from "@/lib/erpStore";
import { todayStr, SELL_GST_RATE, withGst } from "@/lib/format";

// Clean number formatting for PDF and Excel summary fields (avoiding Unicode rupee symbols to prevent PDF rendering bugs)
const formatCurrency = (n: number) => 
  "Rs. " + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);

const formatQty = (n: number) => 
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number.isFinite(n) ? n : 0) + " t";

// Reusable column auto-fit helper for Excel worksheets
function autoFitColumns(ws: XLSX.WorkSheet) {
  if (!ws || !ws["!ref"]) return;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = 12; // Min width in characters
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const valStr = String(cell.v);
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
    }
    cols.push({ wch: maxLen + 3 }); // Padding
  }
  ws["!cols"] = cols;
}

export function exportToExcel(
  rm: PcEntry[],
  sells: Sell[],
  ex: Expense[],
  settings: Settings,
  totalStock: number,
  effectiveMoney: number,
  range: "today" | "full" | "custom",
  startDate?: string,
  endDate?: string
) {
  const wb = XLSX.utils.book_new();

  // Create range label
  let rangeLabel = "Full History (From Start)";
  if (range === "today") {
    rangeLabel = `Today (${new Date().toLocaleDateString("en-IN")})`;
  } else if (range === "custom" && startDate && endDate) {
    rangeLabel = `${startDate.split("-").reverse().join("/")} to ${endDate.split("-").reverse().join("/")}`;
  }

  // 1. Summary Sheet
  const summaryData = [
    ["Ledger ERP Business Report", ""],
    ["Report Period", rangeLabel],
    ["Generated On", new Date().toLocaleString("en-IN")],
    [""],
    ["CURRENT LIVE STATUS", ""],
    ["Current Net Money (Available)", Number(effectiveMoney.toFixed(2))],
    ["Current Stock Inventory (tons)", Number(totalStock.toFixed(3))],
    ["Stock Adjustment Offset (tons)", Number(settings.stock_adjustment)],
    ["Total Lock Amount", Number(settings.lock_money)],
    [""],
    ["REPORT PERIOD STATISTICS", ""],
    ["Total Materials Purchased (tons)", Number(rm.reduce((s, r) => s + (Number(r.qty) || 0), 0).toFixed(3))],
    ["Total Purchases Spend", Number(rm.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0).toFixed(2))],
    ["Total Sales Volume (tons)", Number(sells.reduce((s, r) => s + (Number(r.quantity) || 0), 0).toFixed(3))],
    ["Total Sales Invoice Value (GST incl.)", Number(sells.reduce((s, r) => s + withGst((Number(r.quantity) || 0) * (Number(r.rate) || 0)), 0).toFixed(2))],
    ["Total Net Sales Revenue (w/o Gadi Bhada)", Number(sells.reduce((s, r) => s + (withGst((Number(r.quantity) || 0) * (Number(r.rate) || 0)) - (Number(r.gadi_bhada) || 0)), 0).toFixed(2))],
    ["Total Transport Costs (Gadi Bhada)", Number(sells.reduce((s, r) => s + (Number(r.gadi_bhada) || 0), 0).toFixed(2))],
    ["Total Maintenance Spend", Number(ex.reduce((s, r) => s + (Number(r.amount) || 0), 0).toFixed(2))],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  autoFitColumns(summarySheet);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // 2. Raw Materials Sheet (mapping PcEntry)
  const rmSheet = XLSX.utils.json_to_sheet(
    rm.map((r) => {
      const totalAmt = (Number(r.qty) || 0) * (Number(r.rate) || 0);
      const pay = Number(r.payment) || 0;
      return {
        "Pc No.": r.pc_no,
        Date: r.entry_date,
        "Supplier Name": r.name,
        "Rate (Rs./t)": Number(r.rate),
        "Quantity (t)": Number(r.qty),
        "Total Amount (Rs.)": Number(totalAmt.toFixed(2)),
        "Payment (Rs.)": pay,
        "Difference (Rs.)": Number((totalAmt - pay).toFixed(2)),
      };
    })
  );
  autoFitColumns(rmSheet);
  XLSX.utils.book_append_sheet(wb, rmSheet, "Raw Materials");

  // 3. Sells Sheet
  const sellsSheet = XLSX.utils.json_to_sheet(
    sells.map((s) => {
      const baseAmt = (Number(s.quantity) || 0) * (Number(s.rate) || 0);
      const gstAmt = baseAmt * SELL_GST_RATE;
      const totalGST = withGst(baseAmt);
      const netWithoutGB = totalGST - (Number(s.gadi_bhada) || 0);
      return {
        "S.No": s.serial_number,
        Date: s.entry_date,
        "Client Name": s.name,
        "Vehicle Number": s.vehicle_number || "—",
        "Quantity (t)": Number(s.quantity),
        "Rate (Rs./t)": Number(s.rate),
        "Total (w/o GST) (Rs.)": Number(baseAmt.toFixed(2)),
        "Gadi Bhada (Rs.)": Number(s.gadi_bhada || 0),
        "GST (5%) (Rs.)": Number(gstAmt.toFixed(2)),
        "Total Amount (GST incl.) (Rs.)": Number(totalGST.toFixed(2)),
        "Amt w/o Gadi Bhada (GST) (Rs.)": Number(netWithoutGB.toFixed(2)),
        "Payment Received (Rs.)": Number(s.payment),
        "Outstanding Balance (Rs.)": Number(s.payment) - netWithoutGB,
      };
    })
  );
  autoFitColumns(sellsSheet);
  XLSX.utils.book_append_sheet(wb, sellsSheet, "Sells");

  // 4. Maintenance Sheet
  const exSheet = XLSX.utils.json_to_sheet(
    ex.map((e) => ({
      "S.No": e.serial_number,
      Date: e.entry_date,
      "Expense Name": e.name,
      Category: e.category.replace("_", " "),
      "Amount (Rs.)": Number(e.amount),
    }))
  );
  autoFitColumns(exSheet);
  XLSX.utils.book_append_sheet(wb, exSheet, "Maintenance");

  // Write and Save
  const cleanRangeName = range === "custom" ? "custom-range" : range;
  XLSX.writeFile(wb, `ledger-erp-report-${cleanRangeName}-${todayStr()}.xlsx`);
}

export function exportToPDF(
  rm: PcEntry[],
  sells: Sell[],
  ex: Expense[],
  settings: Settings,
  totalStock: number,
  effectiveMoney: number,
  range: "today" | "full" | "custom",
  startDate?: string,
  endDate?: string
) {
  const doc = new jsPDF({ orientation: "portrait" });
  const w = doc.internal.pageSize.getWidth();

  // Range Label formatting
  let rangeLabel = "Full History (From Start)";
  if (range === "today") {
    rangeLabel = `Today (${new Date().toLocaleDateString("en-IN")})`;
  } else if (range === "custom" && startDate && endDate) {
    rangeLabel = `${startDate.split("-").reverse().join("/")} to ${endDate.split("-").reverse().join("/")}`;
  }

  // --- COVER & SUMMARY SECTION ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("LEDGER ERP BUSINESS REPORT", w / 2, 22, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Period: ${rangeLabel}`, w / 2, 29, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, w / 2, 34, { align: "center" });

  // Draw separator line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 38, w - 14, 38);

  // Filtered/Period Statistics mapping PcEntry fields
  const rmSpend = rm.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  const rmQty = rm.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const salesQty = sells.reduce((s, r) => s + Number(r.quantity), 0);
  const salesRevenue = sells.reduce((s, r) => s + withGst((Number(r.quantity) || 0) * (Number(r.rate) || 0)), 0);
  const maintSpend = ex.reduce((s, r) => s + Number(r.amount), 0);
  const totalGadiBhada = sells.reduce((s, r) => s + Number(r.gadi_bhada), 0);

  // Executive summary grid
  autoTable(doc, {
    startY: 42,
    head: [["Performance Metrics", "Report Value"]],
    body: [
      ["Report Period Purchases Spend", formatCurrency(rmSpend)],
      ["Report Period Purchases Volume", formatQty(rmQty)],
      ["Report Period Sales Volume", formatQty(salesQty)],
      ["Report Period Gross Sales Revenue", formatCurrency(salesRevenue)],
      ["Report Period Transport Spend (Gadi Bhada)", formatCurrency(totalGadiBhada)],
      ["Report Period Maintenance Spend", formatCurrency(maintSpend)],
      ["Current Available Money (Live Balance)", formatCurrency(effectiveMoney)],
      ["Current Stock Inventory (Live Volume)", formatQty(totalStock)],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 10, fontStyle: "bold" },
    styles: { fontSize: 9.5, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.5 },
  });

  // --- RAW MATERIALS SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSummaryY = (doc as any).lastAutoTable.finalY + 12;
  doc.text("1. Raw Materials (Daily PC Entries)", 14, afterSummaryY);

  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: afterSummaryY + 4,
    head: [["Pc No.", "Date", "Supplier Name", "Rate (Rs/t)", "Qty (t)", "Total (Rs.)"]],
    body: rm.map((r) => [
      r.pc_no,
      r.entry_date,
      r.name,
      new Intl.NumberFormat("en-IN").format(Number(r.rate)),
      Number(r.qty).toFixed(3),
      new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(r.qty) * Number(r.rate)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [47, 73, 117], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.5 },
  });

  // --- SELLS / SALES SECTION ---
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Sales Ledger", 14, 18);

  autoTable(doc, {
    startY: 22,
    head: [["#", "Date", "Client Name", "Qty (t)", "Rate", "G.Bhada", "Total (GST)", "Payment", "Balance"]],
    body: sells.map((s) => {
      const baseAmt = (Number(s.quantity) || 0) * (Number(s.rate) || 0);
      const totalGST = withGst(baseAmt);
      const netWithoutGB = totalGST - (Number(s.gadi_bhada) || 0);
      const diff = Number(s.payment) - netWithoutGB;
      return [
        s.serial_number,
        s.entry_date,
        s.name,
        Number(s.quantity).toFixed(3),
        new Intl.NumberFormat("en-IN").format(Number(s.rate)),
        new Intl.NumberFormat("en-IN").format(Number(s.gadi_bhada || 0)),
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(totalGST),
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(s.payment)),
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(diff),
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9 }, // Modern teal for sells
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.5 },
  });

  // --- MAINTENANCE / EXPENSES SECTION ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSellsY = (doc as any).lastAutoTable.finalY + 12;
  
  // Decide whether to add page or render below sells
  if (afterSellsY > 220) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. Maintenance & Expenses", 14, 18);
    autoTable(doc, {
      startY: 22,
      head: [["#", "Date", "Expense Name", "Category", "Amount (Rs.)"]],
      body: ex.map((e) => [
        e.serial_number,
        e.entry_date,
        e.name,
        e.category.replace("_", " "),
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(e.amount)),
      ]),
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 9 }, // Amber header
      styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.5 },
    });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. Maintenance & Expenses", 14, afterSellsY);
    autoTable(doc, {
      startY: afterSellsY + 4,
      head: [["#", "Date", "Expense Name", "Category", "Amount (Rs.)"]],
      body: ex.map((e) => [
        e.serial_number,
        e.entry_date,
        e.name,
        e.category.replace("_", " "),
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(Number(e.amount)),
      ]),
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 9 }, // Amber header
      styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.5 },
    });
  }

  const cleanRangeName = range === "custom" ? "custom-range" : range;
  doc.save(`ledger-erp-report-${cleanRangeName}-${todayStr()}.pdf`);
}

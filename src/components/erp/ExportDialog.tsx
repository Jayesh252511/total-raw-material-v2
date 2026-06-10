import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSpreadsheet, FileText, Download, Calendar } from "lucide-react";
import type { PcEntry, Expense, Sell, Settings } from "@/lib/erpStore";
import { exportToExcel, exportToPDF } from "@/lib/exporters";
import { todayStr } from "@/lib/format";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFormat: "excel" | "pdf";
  rawMaterials: PcEntry[];
  sells: Sell[];
  expenses: Expense[];
  settings: Settings;
  totalStock: number;
  effectiveMoney: number;
};

export function ExportDialog({
  open,
  onOpenChange,
  defaultFormat,
  rawMaterials,
  sells,
  expenses,
  settings,
  totalStock,
  effectiveMoney,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"excel" | "pdf">(defaultFormat);
  const [range, setRange] = useState<"today" | "full" | "custom">("full");
  
  // Set start of month as default start date and today as end date
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr);

  // Sync format with defaultFormat when dialog opens
  useState(() => {
    setFormat(defaultFormat);
  });

  const handleExport = () => {
    // 1. Filter the data based on range
    const filterFn = (entryDate: string) => {
      if (range === "today") {
        return entryDate === todayStr();
      }
      if (range === "custom") {
        return entryDate >= startDate && entryDate <= endDate;
      }
      return true; // full
    };

    const filteredRM = rawMaterials.filter((r) => filterFn(r.entry_date));
    const filteredSells = sells.filter((s) => filterFn(s.entry_date));
    const filteredExpenses = expenses.filter((e) => filterFn(e.entry_date));

    // 2. Call the correct exporter
    if (format === "excel") {
      exportToExcel(
        filteredRM,
        filteredSells,
        filteredExpenses,
        settings,
        totalStock,
        effectiveMoney,
        range,
        startDate,
        endDate
      );
    } else {
      exportToPDF(
        filteredRM,
        filteredSells,
        filteredExpenses,
        settings,
        totalStock,
        effectiveMoney,
        range,
        startDate,
        endDate
      );
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border bg-card p-6 shadow-elevated">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            {format === "excel" ? (
              <FileSpreadsheet className="h-5.5 w-5.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileText className="h-5.5 w-5.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>Export Business Report</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Export Format
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                className={`h-11 justify-start gap-2.5 rounded-xl border px-4 transition-all hover:bg-muted/10 ${
                  format === "pdf"
                    ? "bg-indigo-600 text-white shadow-soft hover:bg-indigo-700"
                    : "border-input bg-background"
                }`}
                onClick={() => setFormat("pdf")}
              >
                <FileText className="h-4.5 w-4.5 shrink-0" />
                <span className="font-medium">Professional PDF</span>
              </Button>
              <Button
                type="button"
                variant={format === "excel" ? "default" : "outline"}
                className={`h-11 justify-start gap-2.5 rounded-xl border px-4 transition-all hover:bg-muted/10 ${
                  format === "excel"
                    ? "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700"
                    : "border-input bg-background"
                }`}
                onClick={() => setFormat("excel")}
              >
                <FileSpreadsheet className="h-4.5 w-4.5 shrink-0" />
                <span className="font-medium">Professional Excel</span>
              </Button>
            </div>
          </div>

          {/* Range Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Report Range
            </Label>
            <RadioGroup
              value={range}
              onValueChange={(v: "today" | "full" | "custom") => setRange(v)}
              className="grid gap-2.5"
            >
              <div className="flex items-center space-x-3 rounded-xl border bg-background/50 p-3.5 transition-all hover:bg-muted/15">
                <RadioGroupItem value="today" id="range-today" />
                <Label htmlFor="range-today" className="flex-1 cursor-pointer font-medium">
                  Today's Report
                  <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                    Only export transactions entered today ({new Date().toLocaleDateString("en-IN")})
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-xl border bg-background/50 p-3.5 transition-all hover:bg-muted/15">
                <RadioGroupItem value="custom" id="range-custom" />
                <Label htmlFor="range-custom" className="flex-1 cursor-pointer font-medium">
                  Date to Date Range
                  <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                    Select a custom start and end date for the report
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-xl border bg-background/50 p-3.5 transition-all hover:bg-muted/15">
                <RadioGroupItem value="full" id="range-full" />
                <Label htmlFor="range-full" className="flex-1 cursor-pointer font-medium">
                  Full Report (From Start)
                  <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                    Export all records and history stored since the beginning
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Picker Grid if range is custom */}
          {range === "custom" && (
            <div className="grid grid-cols-2 gap-3.5 rounded-xl border bg-muted/20 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Start Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-lg pr-8"
                  />
                  <Calendar className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-[11px] font-semibold uppercase text-muted-foreground">
                  End Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-lg pr-8"
                  />
                  <Calendar className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border h-10 px-4"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={`rounded-xl h-10 px-5 gap-2 font-semibold ${
              format === "excel"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            <span>Generate & Download</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

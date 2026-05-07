import { useMemo } from "react";
import { AlertsBar } from "@/components/erp/AlertsBar";
import { AppShell } from "@/components/erp/AppShell";
import { SummaryCards } from "@/components/erp/SummaryCards";
import { useAuth } from "@/lib/auth";
import { useERPData } from "@/lib/erpStore";
import { isThisMonth, isToday } from "@/lib/format";

type Props = {
  children: (ctx: ReturnType<typeof useERPData> & { readOnly: boolean }) => React.ReactNode;
  showSummary?: boolean;
  showAlerts?: boolean;
};

export function ERPPageFrame({ children, showSummary = true, showAlerts = true }: Props) {
  const erp = useERPData();
  const { isAdmin } = useAuth();
  const readOnly = !isAdmin;

  const stats = useMemo(() => {
    const todayMaint = erp.expenses.filter((e) => isToday(e.entry_date)).reduce((s, e) => s + Number(e.amount), 0);
    const monthMaint = erp.expenses.filter((e) => isThisMonth(e.entry_date)).reduce((s, e) => s + Number(e.amount), 0);
    const amt = (r: { qty: number; rate: number }) => (Number(r.qty) || 0) * (Number(r.rate) || 0);
    const todayRM = erp.pcEntries.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + amt(r), 0);
    const monthRM = erp.pcEntries.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + amt(r), 0);
    const todayTons = erp.pcEntries.filter((r) => isToday(r.entry_date)).reduce((s, r) => s + Number(r.qty), 0);
    const monthTons = erp.pcEntries.filter((r) => isThisMonth(r.entry_date)).reduce((s, r) => s + Number(r.qty), 0);
    return {
      totalMoney: erp.effectiveMoney,
      sellMoney: erp.settings.sell_money,
      totalStock: erp.totalStock,
      todayExpense: todayMaint + todayRM,
      monthExpense: monthMaint + monthRM,
      todayTons,
      monthTons,
      todayMaint,
      monthMaint,
    };
  }, [erp.pcEntries, erp.expenses, erp.effectiveMoney, erp.settings.sell_money, erp.totalStock]);

  return (
    <AppShell settings={erp.settings} readOnly={readOnly} rawMaterials={erp.rawMaterials} expenses={erp.expenses} totalStock={erp.totalStock}>
      {erp.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[88px] rounded-xl border bg-card animate-pulse" />)}
        </div>
      ) : showSummary ? <SummaryCards {...stats} /> : null}
      {showAlerts && <AlertsBar settings={erp.settings} totalStock={erp.totalStock} rawMaterials={erp.rawMaterials} expenses={erp.expenses} />}
      {children({ ...erp, readOnly })}
    </AppShell>
  );
}
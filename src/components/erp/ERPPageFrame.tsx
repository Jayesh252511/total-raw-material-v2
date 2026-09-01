import { useMemo } from "react";
import { AlertsBar } from "@/components/erp/AlertsBar";
import { AppShell } from "@/components/erp/AppShell";
import { SummaryCards } from "@/components/erp/SummaryCards";
import { useAuth } from "@/lib/auth";
import { useERPData } from "@/lib/erpStore";
import { isThisYear, isToday, withGst } from "@/lib/format";

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
    const expenses = erp.expenses || [];
    const pcEntries = erp.pcEntries || [];
    const sells = erp.sells || [];

    const todayMaint = expenses.filter((e) => isToday(e?.entry_date)).reduce((s, e) => s + Number(e?.amount || 0), 0);
    const yearMaint = expenses.filter((e) => isThisYear(e?.entry_date)).reduce((s, e) => s + Number(e?.amount || 0), 0);
    const amt = (r: { qty: number; rate: number }) => (Number(r?.qty) || 0) * (Number(r?.rate) || 0);
    const todayRM = pcEntries.filter((r) => isToday(r?.entry_date)).reduce((s, r) => s + amt(r), 0);
    const yearRM = pcEntries.filter((r) => isThisYear(r?.entry_date)).reduce((s, r) => s + amt(r), 0);
    const todayTons = pcEntries.filter((r) => isToday(r?.entry_date)).reduce((s, r) => s + Number(r?.qty || 0), 0);
    const yearTons = pcEntries.filter((r) => isThisYear(r?.entry_date)).reduce((s, r) => s + Number(r?.qty || 0), 0);
    const sellMoney = sells.reduce((s, r) => s + (Number(r?.payment) || 0), 0);
    const sellWithoutGBNoGST = sells.reduce((s, r) => s + ((Number(r?.quantity) || 0) * (Number(r?.rate) || 0) - (Number(r?.gadi_bhada) || 0)), 0);
    return {
      totalMoney: erp.effectiveMoney || 0,
      sellMoney: sellMoney,
      sellWithoutGBNoGST,
      lockMoney: erp.settings?.lock_money || 0,
      totalStock: erp.totalStock || 0,
      todayExpense: todayMaint + todayRM,
      yearExpense: erp.yearExpense || 0,
      todayTons,
      yearTons,
      todayMaint,
      yearMaint,
      yearRM,
    };
  }, [erp.pcEntries, erp.expenses, erp.sells, erp.effectiveMoney, erp.settings, erp.totalStock, erp.yearExpense]);

  return (
    <AppShell settings={erp.settings} effectiveMoney={erp.effectiveMoney} readOnly={readOnly} rawMaterials={erp.pcEntries} sells={erp.sells} expenses={erp.expenses} totalStock={erp.totalStock}>
      {erp.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[88px] rounded-xl border bg-card animate-pulse" />)}
        </div>
      ) : showSummary ? <SummaryCards {...stats} /> : null}
      {showAlerts && <AlertsBar settings={erp.settings} effectiveMoney={erp.effectiveMoney} totalStock={erp.totalStock} rawMaterials={erp.rawMaterials} expenses={erp.expenses} />}
      {children({ ...erp, readOnly })}
    </AppShell>
  );
}
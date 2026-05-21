import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalDb } from "@/integrations/external-db/client";
import { isThisYear } from "@/lib/format";

export type RawMaterial = {
  id: string;
  serial_number: number;
  entry_date: string;
  name: string;
  rate: number;
  quantity: number;
  total_amount: number;
  payment: number;
};

export type Sell = RawMaterial & { vehicle_number: string; gadi_bhada: number };

export type ExpenseCategory = "petrol_diesel" | "operator" | "other";

export type Expense = {
  id: string;
  serial_number: number;
  entry_date: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
};

export type Settings = {
  total_money: number;
  sell_money: number;
  lock_money: number;
  stock_adjustment: number;
  low_money_threshold: number;
  low_stock_threshold: number;
  high_txn_threshold: number;
};

export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  device_info: string | null;
  location_info: string | null;
  created_at: string;
};

export type Role = "admin" | "viewer";

export function useRole(): [Role, (r: Role) => void] {
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "admin";
    return (localStorage.getItem("erp_role") as Role) || "admin";
  });
  const setRole = (r: Role) => {
    localStorage.setItem("erp_role", r);
    setRoleState(r);
  };
  return [role, setRole];
}

export type PcEntry = {
  id: string;
  entry_date: string;
  pc_no: number;
  name: string;
  qty: number;
  rate: number;
  payment: number;
};

export function useERPData() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [sells, setSells] = useState<Sell[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pcEntries, setPcEntries] = useState<PcEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({
    total_money: 0,
    sell_money: 0,
    lock_money: 0,
    stock_adjustment: 0,
    low_money_threshold: 10000,
    low_stock_threshold: 5,
    high_txn_threshold: 50000,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [rm, sl, ex, st, al, pc] = await Promise.all([
      supabase.from("raw_materials").select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      (supabase.from("sells" as never) as never as ReturnType<typeof supabase.from>).select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      supabase.from("expenses").select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      externalDb.from("entries").select("*").order("entry_date", { ascending: false }).order("pc_no", { ascending: false }),
    ]);
    if (rm.data) setRawMaterials(rm.data as unknown as RawMaterial[]);
    if (sl.data) setSells(sl.data as unknown as Sell[]);
    if (ex.data) setExpenses(ex.data as unknown as Expense[]);
    if (pc.data) setPcEntries(pc.data as unknown as PcEntry[]);
    if (st.data) setSettings({
      total_money: Number(st.data.total_money),
      sell_money: Number((st.data as { sell_money?: number }).sell_money ?? 0),
      lock_money: Number((st.data as { lock_money?: number }).lock_money ?? 0),
      stock_adjustment: Number(st.data.stock_adjustment ?? 0),
      low_money_threshold: Number(st.data.low_money_threshold),
      low_stock_threshold: Number(st.data.low_stock_threshold),
      high_txn_threshold: Number(st.data.high_txn_threshold),
    });
    if (al.data) setAuditLogs(al.data as AuditLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("erp-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => refresh())
      .subscribe();
    const ext = externalDb
      .channel("ext-entries-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      externalDb.removeChannel(ext);
    };
  }, [refresh]);

  // PC entries add stock; money is tracked manually via settings (full audit history)
  const pcStock = pcEntries.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const pcAmount = pcEntries.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  const soldStock = sells.reduce((s, r) => s + Number(r.quantity || 0), 0);
  const totalStock = pcStock - soldStock + Number(settings.stock_adjustment || 0);

  // Calculate Yearly Expenses (Maintenance + Raw Material Purchases)
  const yearMaint = expenses.filter((e) => isThisYear(e.entry_date)).reduce((s, e) => s + Number(e.amount), 0);
  const yearRM = pcEntries.filter((r) => isThisYear(r.entry_date)).reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  const yearExpense = yearMaint + yearRM;

  // Total Money = Lock Amount - Yearly Expense
  const effectiveMoney = Number(settings.lock_money || 0) - yearExpense;

  return { rawMaterials, sells, expenses, pcEntries, settings, auditLogs, loading, refresh, totalStock, pcStock, soldStock, pcAmount, yearExpense, effectiveMoney };
}

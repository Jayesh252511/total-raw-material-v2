import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export type Sell = RawMaterial & { vehicle_number: string };

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

export function useERPData() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [sells, setSells] = useState<Sell[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>({
    total_money: 0,
    stock_adjustment: 0,
    low_money_threshold: 10000,
    low_stock_threshold: 5,
    high_txn_threshold: 50000,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [rm, sl, ex, st, al] = await Promise.all([
      supabase.from("raw_materials").select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      (supabase.from("sells" as never) as never as ReturnType<typeof supabase.from>).select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      supabase.from("expenses").select("*").order("entry_date", { ascending: false }).order("serial_number", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (rm.data) setRawMaterials(rm.data as unknown as RawMaterial[]);
    if (sl.data) setSells(sl.data as unknown as Sell[]);
    if (ex.data) setExpenses(ex.data as unknown as Expense[]);
    if (st.data) setSettings({
      total_money: Number(st.data.total_money),
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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  const purchasedStock = rawMaterials.reduce((s, r) => s + Number(r.quantity || 0), 0);
  const soldStock = sells.reduce((s, r) => s + Number(r.quantity || 0), 0);
  const totalStock = purchasedStock - soldStock + Number(settings.stock_adjustment || 0);

  return { rawMaterials, sells, expenses, settings, auditLogs, loading, refresh, totalStock, purchasedStock, soldStock };
}

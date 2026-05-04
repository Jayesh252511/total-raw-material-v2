import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Settings } from "@/lib/erpStore";
import { toast } from "sonner";

export function SettingsDialog({ settings, disabled }: { settings: Settings; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [money, setMoney] = useState(String(settings.total_money));
  const [lowM, setLowM] = useState(String(settings.low_money_threshold));
  const [lowS, setLowS] = useState(String(settings.low_stock_threshold));
  const [highT, setHighT] = useState(String(settings.high_txn_threshold));

  async function save() {
    const before = { ...settings };
    const after = {
      total_money: Number(money) || 0,
      low_money_threshold: Number(lowM) || 0,
      low_stock_threshold: Number(lowS) || 0,
      high_txn_threshold: Number(highT) || 0,
    };
    const { error } = await supabase.from("settings").update(after).eq("id", 1);
    if (error) return toast.error(error.message);
    await logAudit("settings_changed", "settings", "1", { before, after });
    toast.success("Settings saved");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setMoney(String(settings.total_money));
        setLowM(String(settings.low_money_threshold));
        setLowS(String(settings.low_stock_threshold));
        setHighT(String(settings.high_txn_threshold));
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-8">
          <SettingsIcon className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings & Thresholds</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Total Money Available (₹)</Label>
            <Input type="number" step="0.01" value={money} onChange={(e) => setMoney(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Set the cash balance. Auto-deducted on entries.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Low Money Alert (₹)</Label>
              <Input type="number" value={lowM} onChange={(e) => setLowM(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Low Stock Alert (t)</Label>
              <Input type="number" value={lowS} onChange={(e) => setLowS(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">High Txn (₹)</Label>
              <Input type="number" value={highT} onChange={(e) => setHighT(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

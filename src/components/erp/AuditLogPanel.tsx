import type { AuditLog } from "@/lib/erpStore";
import { History, MapPin, MonitorSmartphone, Plus, Pencil, Trash2, Settings as SettingsIcon } from "lucide-react";

const iconMap = {
  created: { icon: Plus, cls: "text-success bg-success/10" },
  updated: { icon: Pencil, cls: "text-info bg-info/10" },
  deleted: { icon: Trash2, cls: "text-destructive bg-destructive/10" },
  settings_changed: { icon: SettingsIcon, cls: "text-warning bg-warning/15" },
};

export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Audit Log</h3>
        <span className="text-xs text-muted-foreground">· latest 200 events</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y">
        {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No activity yet.</p>}
        {logs.map((log) => {
          const def = iconMap[log.action as keyof typeof iconMap] ?? iconMap.updated;
          const Icon = def.icon;
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md ${def.cls}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium capitalize">{log.action.replace("_", " ")}</span>{" "}
                  <span className="text-muted-foreground">{log.entity.replace("_", " ")}</span>
                  {log.details && typeof log.details === "object" && "field" in log.details && (
                    <span className="text-muted-foreground"> · {String((log.details as { field: string }).field)}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{new Date(log.created_at).toLocaleString("en-IN")}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {log.device_info && (
                    <span className="inline-flex items-center gap-1"><MonitorSmartphone className="h-3 w-3" />{log.device_info}</span>
                  )}
                  {log.location_info && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{log.location_info}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

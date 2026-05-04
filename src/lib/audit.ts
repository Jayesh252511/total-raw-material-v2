import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: "created" | "updated" | "deleted" | "settings_changed",
  entity: "raw_material" | "expense" | "settings",
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await supabase.from("audit_logs").insert({
      action,
      entity,
      entity_id: entityId,
      details: { ...details, ua: typeof navigator !== "undefined" ? navigator.userAgent : null },
    });
  } catch (e) {
    // best-effort
    console.warn("audit failed", e);
  }
}

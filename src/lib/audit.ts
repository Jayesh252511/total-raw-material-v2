import { supabase } from "@/integrations/supabase/client";

function getDeviceInfo() {
  if (typeof navigator === "undefined") return null;
  const platform = navigator.platform || "Unknown platform";
  const touch = navigator.maxTouchPoints > 1 ? "touch" : "pointer";
  const screenSize = typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "unknown screen";
  return `${platform} · ${touch} · ${screenSize}`;
}

async function getLocationInfo() {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    return [data.city, data.region, data.country_name].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

export async function logAudit(
  action: "created" | "updated" | "deleted" | "settings_changed",
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    const [deviceInfo, locationInfo] = await Promise.all([Promise.resolve(getDeviceInfo()), getLocationInfo()]);
    await supabase.from("audit_logs").insert({
      action,
      entity,
      entity_id: entityId,
      device_info: deviceInfo,
      location_info: locationInfo,
      details: { ...details, ua: typeof navigator !== "undefined" ? navigator.userAgent : null },
    });
  } catch (e) {
    // best-effort
    console.warn("audit failed", e);
  }
}

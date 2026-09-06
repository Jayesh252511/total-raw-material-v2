import { useState, useEffect } from "react";
import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { fmtINR, fmtTons } from "@/lib/format";

type Props = {
  effectiveMoney: number;
  totalStock: number;
  todayExpense: number;
  todayTons: number;
};

export function GoodMorningBanner({
  effectiveMoney,
  totalStock,
  todayTons,
}: Props) {
  const [greeting, setGreeting] = useState("Good Afternoon, Parth Fuel Corporation");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const formattedTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      setTimeStr(formattedTime);

      if (hour >= 5 && hour < 12) {
        setGreeting("Good Morning, Parth Fuel Corporation");
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good Afternoon, Parth Fuel Corporation");
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good Evening, Parth Fuel Corporation");
      } else {
        setGreeting("Welcome, Parth Fuel Corporation");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-soft transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Simple Clean Greeting */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {greeting}
            </h2>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded border border-border/40">
              {timeStr}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Raw Material • Business Overview & Live Ledger
          </p>
        </div>

        {/* Right: Quick Clean Key Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-muted/50 px-3 py-1.5 border border-border/40">
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Net Balance</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{fmtINR(effectiveMoney)}</span>
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-1.5 border border-border/40">
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Current Stock</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{fmtTons(totalStock)}</span>
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-1.5 border border-border/40">
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Today Dispatched</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{fmtTons(todayTons)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

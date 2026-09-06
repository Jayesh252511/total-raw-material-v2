import { useState, useEffect } from "react";
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
    <div
      className="relative overflow-hidden rounded-2xl border border-white/20 p-5 shadow-card transition-all"
      style={{
        backgroundImage: "url('/parth-fuel-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center 40%",
      }}
    >
      {/* Dark Legibility Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-900/85 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-white">
        {/* Left: Greeting & Company Branding */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              {greeting}
            </h2>
            <span className="text-xs text-emerald-300 font-mono bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur shadow-sm">
              {timeStr}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1 drop-shadow">
            Total Raw Material • People • Planet • Progress • Live Business Ledger
          </p>
        </div>

        {/* Right: Key Metrics Glass Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-slate-900/80 px-3.5 py-2 border border-white/15 backdrop-blur-md shadow-soft">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Net Balance</span>
            <span className="text-sm font-extrabold tabular-nums text-emerald-400">{fmtINR(effectiveMoney)}</span>
          </div>

          <div className="rounded-xl bg-slate-900/80 px-3.5 py-2 border border-white/15 backdrop-blur-md shadow-soft">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Current Stock</span>
            <span className="text-sm font-extrabold tabular-nums text-sky-300">{fmtTons(totalStock)}</span>
          </div>

          <div className="rounded-xl bg-slate-900/80 px-3.5 py-2 border border-white/15 backdrop-blur-md shadow-soft">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Today Dispatched</span>
            <span className="text-sm font-extrabold tabular-nums text-amber-300">{fmtTons(todayTons)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

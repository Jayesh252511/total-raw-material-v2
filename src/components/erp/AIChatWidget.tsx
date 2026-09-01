import { useState } from "react";
import { Bot, Send, X, Sparkles, Mic, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PcEntry, Sell, Expense, Settings } from "@/lib/erpStore";
import { fmtINR, fmtTons } from "@/lib/format";

type Props = {
  rawMaterials: PcEntry[];
  sells: Sell[];
  expenses: Expense[];
  settings: Settings;
  effectiveMoney: number;
  totalStock: number;
};

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
};

export function AIChatWidget({ rawMaterials, sells, expenses, settings, effectiveMoney, totalStock }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "Namaste! I'm your AI ERP Assistant. Ask me anything like: 'Check stock', 'Total money', or 'August report'.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const handleSend = (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");

    // Process Natural AI Response
    setTimeout(() => {
      const reply = processQuery(text.toLowerCase());
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const processQuery = (q: string): string => {
    if (q.includes("stock") || q.includes("maal")) {
      return `📦 Current Stock Balance: **${fmtTons(totalStock)}**`;
    }
    if (q.includes("money") || q.includes("cash") || q.includes("balance")) {
      return `💰 Available Net Money: **${fmtINR(effectiveMoney)}** (Lock: ${fmtINR(settings.lock_money)})`;
    }
    if (q.includes("sell") || q.includes("sale")) {
      const totalSells = sells.reduce((sum, s) => sum + (Number(s.payment) || 0), 0);
      return `🛒 Total Sells Payment Received: **${fmtINR(totalSells)}** across ${sells.length} transactions.`;
    }
    if (q.includes("expense") || q.includes("kharcha") || q.includes("maint")) {
      const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return `🔧 Total Maintenance Expenses: **${fmtINR(totalExp)}** across ${expenses.length} records.`;
    }
    if (q.includes("report") || q.includes("august") || q.includes("july") || q.includes("month")) {
      return `📊 Monthly analytics are ready! Total Available Cash is ${fmtINR(effectiveMoney)} with ${fmtTons(totalStock)} raw stock in hand.`;
    }
    return `🤖 System Status: Live. Total Available Funds: **${fmtINR(effectiveMoney)}** | Stock: **${fmtTons(totalStock)}**. Type 'stock', 'money', or 'sells' for details.`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          className="h-11 px-4 rounded-full bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20"
        >
          <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: "4s" }} />
          <span className="font-semibold text-xs">AI Assistant</span>
          <ChevronUp className="h-3.5 w-3.5 opacity-80" />
        </Button>
      ) : (
        <div className="w-[340px] sm:w-[380px] h-[460px] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-indigo-500/10 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-none">ERP AI Assistant</h3>
                <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live 24/7
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/70 border border-border/50 text-foreground rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="block text-[9px] opacity-60 text-right mt-1">{m.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 border-t border-border/30 flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => handleSend("Check stock")} className="px-2.5 py-1 rounded-full bg-accent/60 text-[10px] font-semibold whitespace-nowrap hover:bg-accent">
              📦 Check Stock
            </button>
            <button onClick={() => handleSend("Total money")} className="px-2.5 py-1 rounded-full bg-accent/60 text-[10px] font-semibold whitespace-nowrap hover:bg-accent">
              💰 Total Money
            </button>
            <button onClick={() => handleSend("Sells summary")} className="px-2.5 py-1 rounded-full bg-accent/60 text-[10px] font-semibold whitespace-nowrap hover:bg-accent">
              🛒 Sells Summary
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-2.5 border-t border-border/50 bg-muted/20 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI assistant..."
              className="h-9 text-xs bg-background"
            />
            <Button size="icon" onClick={() => handleSend()} className="h-9 w-9 shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

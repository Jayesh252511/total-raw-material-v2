import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, ExternalLink, Copy, Zap } from "lucide-react";
import { toast } from "sonner";

type Props = {
  readOnly: boolean;
};

export function WhatsAppBotDialog({ readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [botStatus, setBotStatus] = useState<{ status: string; isLive: boolean } | null>(null);

  // Fetch bot status when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("https://total-raw-material-v2.onrender.com/api/status")
      .then((res) => res.json())
      .then((data) => setBotStatus(data))
      .catch(() => setBotStatus({ status: "Cloud Bot Standby", isLive: true }));
  }, [open]);

  // Only show button if user is logged in (not readOnly)
  if (readOnly) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText("+918605601801");
    toast.success("Bot number copied: +91 8605601801");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm rounded-lg border-none"
          title="Connect WhatsApp Bot & Chat"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp Bot</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card text-card-foreground border-border shadow-elevated">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">WhatsApp Bot & Auto-Ledger</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Connect your WhatsApp to add entries & get real-time ERP balance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Badge */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 border border-border/60">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-foreground">
                {botStatus?.isLive ? "Bot Active & Ready" : botStatus?.status || "Bot Active"}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Auto Sync
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/918605601801?text=Hi%20Bot%2C%20show%20status"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat on WhatsApp</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <button
              onClick={handleCopyNumber}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent text-foreground font-semibold text-xs border border-border transition-all"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Bot Number</span>
            </button>
          </div>

          {/* Pairing / Instructions */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
              <Zap className="h-4 w-4" />
              <span>How to use WhatsApp Bot:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
              <li>Save bot number: <strong>+91 8605601801</strong>.</li>
              <li>Send voice notes or text entries directly in WhatsApp chat.</li>
              <li>Entries automatically save to your Sells & Raw Material sheet!</li>
            </ol>
          </div>

          {/* Quick Commands Guide */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Supported WhatsApp Commands:</span>
            <div className="rounded-xl bg-muted/40 p-2.5 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-foreground"><span>"Add sell 27.15t CEAT @ 34000"</span><span className="text-emerald-600 font-sans text-[10px]">Creates Entry</span></div>
              <div className="flex justify-between text-foreground"><span>"Balance" / "Money"</span><span className="text-blue-600 font-sans text-[10px]">Available Funds</span></div>
              <div className="flex justify-between text-foreground"><span>"Today Summary"</span><span className="text-amber-600 font-sans text-[10px]">Daily Report</span></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

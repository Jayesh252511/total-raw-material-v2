import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function AuthButton() {
  const { user, isAdmin, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    setOpen(false);
    setPassword("");
  }

  if (user) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
          <ShieldCheck className="h-3 w-3" />
          {isAdmin ? "Admin" : "User"}
        </span>
        <Button variant="outline" size="sm" className="h-8" onClick={() => signOut()}>
          <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <LogIn className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Admin Login</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Admin Login</DialogTitle>
          <DialogDescription>Sign in to edit data. Viewers don't need to log in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in..." : "Sign In"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

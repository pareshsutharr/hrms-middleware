import { LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { nowInIst } from "@/lib/cosec/dates";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "./connection-status";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const session = await auth();
  const today = nowInIst().toFormat("dd LLL yyyy");

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <ConnectionStatus />
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{today} (IST)</span>
        <ThemeToggle />
        <span className="hidden text-sm font-medium sm:inline">
          {session?.user?.name ?? session?.user?.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}

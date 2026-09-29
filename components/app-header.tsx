import Link from "next/link";
import { Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  backHref?: string;
  action?: React.ReactNode;
}

export function AppHeader({ title = "RememberMe", backHref, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              ← Back
            </Link>
          ) : (
            <Link href="/" className="font-semibold tracking-tight truncate">
              {title}
            </Link>
          )}
          {backHref && (
            <h1 className="font-semibold truncate">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
          {!backHref && (
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <Settings className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

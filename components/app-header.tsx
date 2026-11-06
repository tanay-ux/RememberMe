import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  backHref?: string;
  action?: React.ReactNode;
  /** Home-style large title instead of compact bar */
  large?: boolean;
}

export function AppHeader({
  title = "RememberMe",
  backHref,
  action,
  large = false,
}: AppHeaderProps) {
  if (large && !backHref) {
    return (
      <header className="mx-auto w-full max-w-2xl px-5 pt-[max(2.75rem,var(--app-sat,env(safe-area-inset-top,0px)))] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              RememberMe
            </p>
            <h1 className="text-[1.75rem] font-semibold leading-snug tracking-tight text-foreground">
              People you&apos;ve met
            </h1>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-brand-soft"
          >
            <Settings className="size-5 stroke-[1.5]" />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full max-w-full bg-background/90 backdrop-blur-md pt-[max(0.75rem,var(--app-sat,env(safe-area-inset-top,0px)))]">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Back"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-brand-soft"
            >
              <ArrowLeft className="size-5 stroke-[1.5]" />
            </Link>
          ) : null}
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">{action}</div>
      </div>
    </header>
  );
}

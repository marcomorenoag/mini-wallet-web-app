import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageShellProps {
  /** Content of the top bar (title, back link, actions); the bar is omitted when not provided. */
  readonly header?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Mobile-first page frame: a single centered column that widens slightly on larger screens, a
 * skip link for keyboard users and a focusable `main` landmark.
 */
export function PageShell({ header, className, children }: PageShellProps) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      {header ? (
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 px-4">{header}</div>
        </header>
      ) : null}
      <main
        id="main"
        tabIndex={-1}
        className={cn(
          "mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 outline-none",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

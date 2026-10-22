import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusMessageProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  /** Call to action, e.g. a retry button or a link back home. */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** Centered message shared by empty, error and not-found states. */
export function StatusMessage({ icon, title, description, action, className }: StatusMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <h1 className="font-heading text-lg font-semibold">{title}</h1>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

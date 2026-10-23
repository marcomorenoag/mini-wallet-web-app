"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * Pending feedback for a `<Link>`, inside which it must be rendered. While the destination is
 * loaded (e.g. before it was prefetched, or on a slow network), the icon is swapped for a spinner,
 * so a tap is visibly acknowledged; without an icon, the spinner is only shown while pending.
 */
export function LinkPendingIcon({ icon = null }: { readonly icon?: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <LoaderCircle aria-hidden className="animate-spin" /> : icon;
}

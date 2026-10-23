"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { parseStep, type TransferStep } from "./model/transfer-flow";

/** The current wizard step lives in `?step=`, so refresh and the browser back button work. */
export function useTransferStep() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const step = parseStep(searchParams.get("step"));

  const goTo = useCallback(
    (next: TransferStep, { replace = false }: { replace?: boolean } = {}) => {
      const url = `${pathname}?step=${next}`;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router],
  );

  return { step, goTo };
}

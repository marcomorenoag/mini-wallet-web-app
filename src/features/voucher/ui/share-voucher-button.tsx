"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Uses the native share sheet when available (mobile), and copies the summary otherwise. */
export function ShareVoucherButton({ text }: { readonly text: string }) {
  const t = useTranslations("voucher");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: t("title"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Dismissing the share sheet rejects; there is nothing to report.
    }
  };

  return (
    <Button variant="outline" size="lg" className="h-11 w-full text-base" onClick={share}>
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      <span aria-live="polite">{copied ? t("copied") : t("share")}</span>
    </Button>
  );
}

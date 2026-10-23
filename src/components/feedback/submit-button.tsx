"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Submit button of a form bound to a Server Action: it is disabled and shows a spinner in place of
 * its icon while the action runs. The form keeps working without JavaScript.
 */
export function SubmitButton({
  icon = null,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { readonly icon?: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : icon}
      {children}
    </Button>
  );
}

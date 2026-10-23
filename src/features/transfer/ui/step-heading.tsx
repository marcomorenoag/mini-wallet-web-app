"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Step title. Focus is moved to it when the step changes, so screen reader and keyboard users
 * land on the new content instead of on the button they just pressed.
 */
export function StepHeading({
  focusOnMount,
  children,
}: {
  readonly focusOnMount: boolean;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  return (
    <h2 ref={ref} tabIndex={-1} className="font-heading text-xl font-semibold outline-none">
      {children}
    </h2>
  );
}

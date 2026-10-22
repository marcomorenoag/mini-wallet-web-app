"use client";

import { m, type HTMLMotionProps } from "motion/react";

interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Delay in seconds, used to stagger sibling elements. */
  readonly delay?: number;
}

/** Fades and slides content in on mount; reduced to an instant change when motion is reduced. */
export function FadeIn({ delay = 0, ...props }: FadeInProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay }}
      {...props}
    />
  );
}

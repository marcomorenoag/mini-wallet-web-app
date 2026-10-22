/**
 * Design tokens consumed from JavaScript, where CSS variables cannot be read at render time.
 * Each value mirrors its CSS counterpart in `tokens.css`; both are changed together.
 */
export const MOTION = {
  /** Durations in seconds, as expected by Motion. */
  duration: {
    fast: 0.15, // --default-transition-duration
    base: 0.2,
  },
  /** Cubic-bézier easings. */
  ease: {
    emphasized: [0.16, 1, 0.3, 1], // --ease-emphasized
  },
} as const;

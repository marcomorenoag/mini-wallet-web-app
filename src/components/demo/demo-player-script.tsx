import Script from "next/script";

/**
 * Loads the scripted product demo (`public/demo-player.js`) when the server is started with
 * `DEMO_PLAYER=enabled`. The variable is read per request, so a normal build ships nothing extra;
 * the player itself only starts on `/login#demo`.
 */
export function DemoPlayerScript() {
  if (process.env.DEMO_PLAYER !== "enabled") return null;
  return <Script src="/demo-player.js" strategy="afterInteractive" />;
}

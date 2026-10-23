/**
 * Random RFC 9562 version 4 UUID. `crypto.randomUUID` is only exposed in secure contexts (HTTPS
 * or `localhost`), so it is missing when the app is opened over plain HTTP on the local network,
 * e.g. from a phone during development. `crypto.getRandomValues` is available in every context,
 * so it is used as the fallback.
 */
export const randomUUID = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

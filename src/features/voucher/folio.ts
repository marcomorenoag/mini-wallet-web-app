/** Short, human-friendly reference of a transfer id: `trf_8f2k19ab-…` → `TX-8F2K19AB`. */
export const formatFolio = (transferId: string): string =>
  `TX-${transferId
    .replace(/^trf_/, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase()}`;

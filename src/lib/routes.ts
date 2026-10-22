/** Page routes shared by the proxy, Server Actions and links. */
export const ROUTES = {
  login: "/login",
  home: "/home",
  transfer: "/transfer",
  /** Followed by the transfer id. */
  voucher: "/voucher",
  /** Clears a session cookie that the server no longer recognizes, then goes to login. */
  sessionExpired: "/session-expired",
} as const;

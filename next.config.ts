import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Private IPv4 addresses of this machine. The dev server rejects the HMR websocket from any host
 * other than `localhost`, and the Turbopack client is never hydrated without it, so these are
 * allowed for testing on a phone over the local network.
 */
const lanAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => address!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses(),
};

export default withNextIntl(nextConfig);

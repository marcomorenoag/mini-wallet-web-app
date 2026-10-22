import packageJson from "../package.json";

const required = packageJson.engines.node.replace(/^>=/, "");

const toParts = (version: string) => version.split(".").map(Number);

/**
 * Some tooling (e.g. jsdom and its bundled undici) crashes with obscure errors on older Node
 * versions, while `engine-strict` is only enforced on install. Test runners call this first.
 */
export function assertNodeVersion(current: string = process.versions.node): void {
  const [major = 0, minor = 0, patch = 0] = toParts(current);
  const [reqMajor = 0, reqMinor = 0, reqPatch = 0] = toParts(required);
  const satisfied =
    major !== reqMajor
      ? major > reqMajor
      : minor !== reqMinor
        ? minor > reqMinor
        : patch >= reqPatch;

  if (!satisfied) {
    throw new Error(
      `Node.js ${required} or newer is required, but ${current} is running. ` +
        "Run `nvm use` to switch to the version pinned in .nvmrc.",
    );
  }
}

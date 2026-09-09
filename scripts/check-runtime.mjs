import { pathToFileURL } from "node:url";

const requiredNode = "Node.js 24.19.0 or newer within Node 24";
const requiredNpm = "npm 11.17.0 or newer within npm 11";

export function runtimeErrors({ nodeVersion, npmVersion }) {
  const errors = [];
  const node = parseVersion(nodeVersion);
  const npm = npmVersion === undefined ? undefined : parseVersion(npmVersion);

  if (node === undefined || node.major !== 24 || node.minor < 19) {
    errors.push(`${requiredNode} is required; found ${nodeVersion || "an unknown Node.js version"}.`);
  }
  if (npmVersion !== undefined && (npm === undefined || npm.major !== 11 || npm.minor < 17)) {
    errors.push(`${requiredNpm} is required; found ${npmVersion || "an unknown npm version"}.`);
  }

  return errors;
}

export function npmVersionFromUserAgent(userAgent) {
  return /(?:^|\s)npm\/(?<version>[^\s]+)/u.exec(userAgent ?? "")?.groups?.version;
}

function parseVersion(value) {
  const match = /^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:[-+].*)?$/u.exec(value ?? "");
  return match?.groups === undefined
    ? undefined
    : {
        major: Number(match.groups.major),
        minor: Number(match.groups.minor),
        patch: Number(match.groups.patch)
      };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = runtimeErrors({
    nodeVersion: process.version,
    npmVersion: npmVersionFromUserAgent(process.env.npm_config_user_agent)
  });

  if (errors.length > 0) {
    console.error([
      "Open Prep cannot run with the current JavaScript toolchain.",
      ...errors,
      "Install the versions pinned in .node-version and package.json, then reopen the terminal and run the command again."
    ].join("\n"));
    process.exitCode = 1;
  }
}

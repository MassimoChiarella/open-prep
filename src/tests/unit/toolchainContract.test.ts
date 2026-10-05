import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("legacy npm compatibility guard", () => {
  it.each([undefined, "npm/8.11.0 node/v16.16.0 win32 x64", "npm/10.0.0 node/v24.19.0 win32 x64"])(
    "rejects %s before repository commands run", (userAgent) => {
      const result = runGuard(userAgent);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("npm 11.17.0+");
    }
  );

  it("lets modern npm enforce devEngines", () => {
    expect(runGuard("npm/11.17.0 node/v24.19.0 win32 x64").status).toBe(0);
  });
});

function runGuard(userAgent: string | undefined) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toLowerCase() === "npm_config_user_agent") delete env[key];
  if (userAgent !== undefined) env.npm_config_user_agent = userAgent;
  return spawnSync(process.execPath, [path.resolve("scripts/check-runtime.mjs")], { encoding: "utf8", env });
}

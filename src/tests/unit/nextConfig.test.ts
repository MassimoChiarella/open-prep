import { execFile } from "node:child_process";
import { promisify } from "node:util";
import packageJson from "../../../package.json";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Next build identity", () => {
  it("uses the release version as a deterministic build ID", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "-e",
      "import config from './next.config.mjs'; console.log(await config.generateBuildId())"
    ], { cwd: process.cwd() });

    expect(stdout.trim()).toBe(`open-prep-v${packageJson.version}`);
  });
});

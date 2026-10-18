// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

const workflow = readFileSync(path.resolve(".github/workflows/ci.yml"), "utf8").replaceAll("\r\n", "\n");

it("gates production on both platforms testing the same clean artifact without rebuilding", () => {
  const verify = jobBlock("verify", "cross_browser");
  const crossBrowser = jobBlock("cross_browser", "deploy_production");
  const deploy = jobBlock("deploy_production");
  const upload = verify.slice(verify.indexOf("      - name: Retain verified web output"), verify.indexOf("      - name: Prepare verified Vercel output"));
  const webIdentity = 'node scripts/prepare-web-build.mjs verify --commit "$GITHUB_SHA" --ref "$GITHUB_REF" --require-clean';

  expect(verify).toContain("runs-on: windows-latest");
  expect(verify).toContain("run: npm run check");
  expect(verify).not.toContain("npm run e2e:cross-browser");
  expect(verify.indexOf("run: npm run check")).toBeLessThan(verify.indexOf("      - name: Validate verified web output"));
  expect(verify.indexOf("      - name: Validate verified web output")).toBeLessThan(verify.indexOf("      - name: Retain verified web output"));
  expect(upload).toContain("name: web-output-${{ github.sha }}-${{ github.run_attempt }}");
  expect(upload).toContain("path: out/");
  expect(upload).toContain("include-hidden-files: true");
  expect(upload).toContain("if-no-files-found: error");
  expect(upload).not.toMatch(/^\s+if:/mu);

  expect(crossBrowser).toContain("needs: verify");
  expect(crossBrowser).toContain("runs-on: ubuntu-latest");
  expect(crossBrowser).toContain("actions: read");
  expect(crossBrowser).toContain("inventory_sha256: ${{ steps.tested_artifact.outputs.inventory_sha256 }}");
  expect(crossBrowser).toContain("ref: ${{ github.sha }}");
  expect(crossBrowser).toContain("ARTIFACT_NAME: ${{ needs.verify.outputs.web_artifact_name }}");
  const download = 'gh run download "$GITHUB_RUN_ID" --name "$ARTIFACT_NAME" --dir out';
  const matrix = "npm run e2e:cross-browser -- --workers=1 --global-timeout=1200000";
  expect(crossBrowser.indexOf(download)).toBeGreaterThan(0);
  expect(crossBrowser.indexOf(webIdentity)).toBeGreaterThan(crossBrowser.indexOf(download));
  expect(crossBrowser.indexOf("run: npm ci")).toBeGreaterThan(crossBrowser.indexOf(webIdentity));
  expect(crossBrowser).toContain("npx playwright install --with-deps chromium firefox webkit");
  expect(crossBrowser).toContain("DEBUG: pw:test,pw:browser");
  expect(crossBrowser).toContain("timeout-minutes: 22");
  expect(crossBrowser.indexOf(matrix)).toBeGreaterThan(crossBrowser.indexOf("run: npm ci"));
  expect(crossBrowser.lastIndexOf(webIdentity)).toBeGreaterThan(crossBrowser.indexOf(matrix));
  expect(crossBrowser.indexOf("appendFileSync(process.env.GITHUB_OUTPUT")).toBeGreaterThan(crossBrowser.lastIndexOf(webIdentity));
  expect(crossBrowser).not.toMatch(/npm run (?:build|check)|continue-on-error|PWTEST_/u);
  expect(workflow).not.toContain("--retries");
  expect(workflow).not.toContain("continue-on-error");
  for (const [job, platform] of [[verify, "windows"], [crossBrowser, "linux"]] as const) {
    expect(job).toContain("if: failure() || cancelled()");
    expect(job).toContain(`playwright-failure-${platform}-\${{ github.run_id }}-\${{ github.run_attempt }}`);
    expect(job).toContain("timeout-minutes: 3");
  }
  expect(deploy).toContain("needs: [verify, cross_browser]");
  expect(deploy).toContain("if: success() && github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.VERCEL_DEPLOY_ENABLED == 'true'");
  expect(deploy).not.toContain("always()");
  expect(deploy).toContain("TESTED_INVENTORY_SHA256: ${{ needs.cross_browser.outputs.inventory_sha256 }}");
  expect(deploy.indexOf("      - name: Bind deployment to the cross-browser tested artifact")).toBeGreaterThan(deploy.indexOf("      - name: Validate the downloaded artifact identity"));
  expect(deploy.indexOf("      - name: Bind deployment to the cross-browser tested artifact")).toBeLessThan(deploy.indexOf("      - name: Stage the verified production deployment"));
  expect(deploy).toContain("ARTIFACT_NAME: ${{ needs.verify.outputs.vercel_artifact_name }}");
  expect(deploy).toContain("--output .vercel/output/static --commit $env:GITHUB_SHA --ref $env:GITHUB_REF --require-clean");
});

function jobBlock(job: string, nextJob?: string): string {
  const start = workflow.indexOf(`  ${job}:`);
  const end = nextJob === undefined ? workflow.length : workflow.indexOf(`  ${nextJob}:`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return workflow.slice(start, end);
}

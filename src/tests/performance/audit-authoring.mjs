// Dedicated production probe; keep other builds/tests idle while measuring.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const [origin = "http://127.0.0.1:43124", output = ".runtime-cache/performance/authoring.json"] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const result = { origin, node: process.version, browser: browser.version(), os: os.platform(), cpu: os.cpus()[0]?.model, viewport: "390x844", delayMs: 20, text: "abcdefghijklmnopqrst", warmups: 1, repetitions: 5, rows: [] };
await mkdir(path.dirname(output), { recursive: true });
try {
  for (const rate of [1, 4]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await page.goto(`${origin}/content-packs/?view=create`, { waitUntil: "networkidle" });
    const builder = page.getByTestId("question-pack-builder");
    await builder.locator("summary").first().click();
    const addBatch = await builder.getByRole("button", { name: "Add Question +10", exact: true }).elementHandle();
    const addOne = await builder.getByRole("button", { name: "Add Question", exact: true }).elementHandle();
    const input = await builder.getByLabel("Question 1 prompt", { exact: true }).elementHandle();
    let currentCount = 1;
    for (const count of [100, 200, 500]) {
      while (currentCount + 10 <= count) { await addBatch.click(); currentCount += 10; }
      while (currentCount < count) { await addOne.click(); currentCount += 1; }
      console.log(JSON.stringify({ rate, count, phase: "typing" }));
      const trials = [];
      for (let trial = -1; trial < 5; trial += 1) {
        await input.fill("");
        // Resolve the field once; selector traversal must not count as typing latency.
        await input.focus();
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => {
          window.auditObserver?.disconnect();
          window.auditTasks = [];
          window.auditObserver = new PerformanceObserver((list) => window.auditTasks.push(...list.getEntries().map((entry) => entry.duration)));
          window.auditObserver.observe({ type: "longtask" });
        });
        const started = performance.now();
        const keys = [];
        for (const key of result.text) {
          const keyStarted = performance.now();
          await page.keyboard.type(key, { delay: 20 });
          keys.push(performance.now() - keyStarted);
        }
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const typeMs = performance.now() - started;
        const durations = await page.evaluate(() => window.auditTasks);
        keys.sort((a, b) => a - b);
        if (trial >= 0) trials.push({ typeMs, keyP95Ms: keys[Math.ceil(keys.length * .95) - 1], longestTaskMs: Math.max(0, ...durations), totalBlockingMs: durations.reduce((total, duration) => total + Math.max(0, duration - 50), 0) });
      }
      const median = (key) => [...trials].map((trial) => trial[key]).sort((a, b) => a - b)[2];
      const row = { rate, count, nodes: await page.locator("*").count(), trials, median: { typeMs: median("typeMs"), keyP95Ms: median("keyP95Ms"), longestTaskMs: median("longestTaskMs") } };
      result.rows.push(row);
      console.log(JSON.stringify({ rate, count, median: row.median }));
      await writeFile(output, JSON.stringify(result, null, 2));
    }
    await context.close();
  }
} finally {
  await browser.close();
}

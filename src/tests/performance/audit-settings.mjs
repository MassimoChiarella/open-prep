import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import path from 'node:path';
import { seed } from './seed-history.mjs';

// Run against a verified production preview, with all other browser/test work idle.
// node src/tests/performance/audit-settings.mjs ORIGIN LABEL [TRIALS]
const base = process.argv[2] ?? 'http://127.0.0.1:43140';
const label = process.argv[3] ?? 'remediation';
const trials = Number(process.argv[4] ?? 5);
const output = path.resolve('.runtime-cache/performance', label);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { base, browser: browser.version(), node: process.version, os: platform() + ' ' + release(), cpu: cpus()[0]?.model, viewport: '1440x1000', warmups: 1, trials, rows: [] };
const save = async (row) => { report.rows.push(row); console.log(JSON.stringify(row)); await writeFile(path.join(output, 'settings.json'), JSON.stringify(report, null, 2)); };
function startProbe() {
  globalThis.auditProbe = { start: performance.now(), tasks: [], gaps: [] };
  const probe = globalThis.auditProbe;
  probe.observer = new PerformanceObserver(list => probe.tasks.push(...list.getEntries().map(entry => entry.duration)));
  probe.observer.observe({ type: 'longtask' });
  let previous = probe.start;
  function tick() { const now = performance.now(); probe.gaps.push(now - previous); previous = now; probe.frame = requestAnimationFrame(tick); }
  probe.frame = requestAnimationFrame(tick);
}
function stopProbe() {
  const probe = globalThis.auditProbe;
  probe.tasks.push(...probe.observer.takeRecords().map(entry => entry.duration));
  probe.observer.disconnect(); cancelAnimationFrame(probe.frame);
  return { elapsedMs: performance.now() - probe.start, maxTaskMs: Math.max(0, ...probe.tasks), blockingMs: probe.tasks.reduce((sum, task) => sum + Math.max(0, task - 50), 0), maxFrameGapMs: Math.max(0, ...probe.gaps) };
}
try {
  for (const count of [200, 1000, 5000]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    if (report.release === undefined) {
      const marker = await context.request.get(base + '/open-prep-release.json');
      if (!marker.ok()) throw new Error('Performance probe requires a verified release marker.');
      report.release = await marker.json();
    }
    await context.addInitScript(startProbe);
    const page = await context.newPage(); page.setDefaultTimeout(180000);
    await page.goto(base + '/settings/', { waitUntil: 'networkidle' });
    await page.getByText(/Built-in defaults initialize Drill Selection/).waitFor();
    await page.evaluate(seed, { count });
    const cdp = await context.newCDPSession(page);
    for (const rate of [1, 4]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      for (let trial = -1; trial < trials; trial++) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('settings-local-data').locator(':scope > summary').waitFor();
        // A fixed observation window includes hydration and preference reads.
        // Inventory must remain absent until a disclosure is opened.
        await page.waitForTimeout(2000);
        if (await page.getByTestId('settings-all-data-clear').locator('dl').count()) throw new Error('Collapsed Settings rendered the inventory.');
        const measurement = await page.evaluate(stopProbe);
        if (trial >= 0) await save({ operation: 'collapsed-settings', count, rate, trial, ...measurement });
        await page.evaluate(startProbe);
        await page.getByTestId('settings-reset').locator(':scope > summary').click();
        await page.getByTestId('settings-all-data-clear').locator('dl').waitFor();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const inventory = await page.evaluate(stopProbe);
        const displayedRecords = await page.getByTestId('settings-all-data-clear').locator('dl > div').filter({ hasText: 'IndexedDB records' }).locator('dd').textContent();
        if (Number(displayedRecords?.replace(/\D/gu, '')) !== count * 21) throw new Error('Settings inventory did not report the seeded record total.');
        if (trial >= 0) await save({ operation: 'opened-settings-inventory', count, rate, trial, ...inventory });
      }
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.getByTestId('settings-local-data').locator(':scope > summary').click();
    if (count === 200) {
      for (const rate of [1, 4]) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        for (let trial = -1; trial < trials; trial++) {
          await page.evaluate(startProbe);
          const pending = page.waitForEvent('download');
          await page.getByRole('button', { name: 'Export Local Progress', exact: true }).click();
          const download = await pending;
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const measurement = await page.evaluate(stopProbe);
          if (trial >= 0) await save({ operation: 'standard-export', count, rate, trial, ...measurement });
          await download.delete();
        }
      }
    }
    if (count === 1000) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.getByRole('button', { name: 'Prepare Complete Backup', exact: true }).click();
      const preview = page.getByTestId('complete-backup-export-preview'); await preview.waitFor();
      await preview.getByRole('checkbox').check();
      const paths = [];
      for (const button of await preview.getByRole('button').all()) {
        const pending = page.waitForEvent('download'); await button.click(); const download = await pending;
        const filePath = path.join(output, download.suggestedFilename()); await download.saveAs(filePath); paths.push(filePath);
      }
      const bytes = (await Promise.all(paths.map(filePath => readFile(filePath)))).reduce((sum, buffer) => sum + buffer.length, 0);
      const file = page.getByLabel('Choose a complete backup file', { exact: true });
      for (const rate of [1, 4]) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        for (let trial = -1; trial < trials; trial++) {
          await file.setInputFiles([]); await page.evaluate(startProbe); await file.setInputFiles(paths);
          await page.getByTestId('complete-backup-restore-preview').waitFor();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const measurement = await page.evaluate(stopProbe);
          if (trial >= 0) await save({ operation: 'complete-restore-preview', count, rate, trial, bytes, parts: paths.length, ...measurement });
        }
      }
    }
    await context.close();
  }
} finally { await browser.close(); await writeFile(path.join(output, 'settings.json'), JSON.stringify(report, null, 2)); }

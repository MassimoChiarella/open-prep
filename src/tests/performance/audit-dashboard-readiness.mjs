// Synthetic production probe; keep other builds/tests idle while measuring.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cpus, platform, release } from 'node:os';
import { seed } from './seed-history.mjs';

const [base, output, countsText = '200,1000,5000', trialsText = '20'] = process.argv.slice(2);
if (!base || !output || !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(base)) {
  throw new Error('Usage: node src/tests/performance/audit-dashboard-readiness.mjs http://127.0.0.1:PORT OUTPUT [200,1000,5000] [20]');
}
const counts = countsText.split(',').map(Number);
const trials = Number(trialsText);
assert(counts.length > 0 && counts.every(count => Number.isSafeInteger(count) && count > 0));
assert.equal(new Set(counts).size, counts.length);
assert(Number.isSafeInteger(trials) && trials > 0);
await mkdir(dirname(output), { recursive: true });
const marker = await (await fetch(new URL('/open-prep-release.json', base))).json();
const browser = await chromium.launch({ headless: true });
const report = {
  marker, browser: browser.version(), node: process.version, platform: platform(), os: release(),
  cpu: cpus()[0].model, viewport: '1440x1000', trials, warmups: 1, rows: [], errors: []
};
const median = values => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
assert.equal(median([3, 1]), 2);
assert.equal(median([3, 1, 2]), 2);

function observe() {
  const state = globalThis.dashboardProbe = { workers: [], tasks: [] };
  const observer = new PerformanceObserver(list => state.tasks.push(...list.getEntries().map(entry => entry.duration)));
  observer.observe({ type: 'longtask', buffered: true });
  state.finish = () => {
    state.tasks.push(...observer.takeRecords().map(entry => entry.duration));
    observer.disconnect();
    return {
      domReadyMs: state.domReadyMs, afterTwoFramesMs: state.afterTwoFramesMs,
      longestTaskMs: Math.max(0, ...state.tasks),
      blockingMs: state.tasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0),
      workers: state.workers
    };
  };
  globalThis.Worker = new Proxy(globalThis.Worker, {
    construct(target, args) {
      const worker = Reflect.construct(target, args);
      const entry = { url: String(args[0]), createdAt: performance.now(), requests: [], messages: [] };
      state.workers.push(entry);
      worker.addEventListener('message', event => entry.messages.push({ at: performance.now(), status: event.data?.status }));
      const post = worker.postMessage.bind(worker);
      worker.postMessage = (...parameters) => {
        entry.requests.push({ at: performance.now(), operation: parameters[0]?.operation ?? 'progress' });
        return post(...parameters);
      };
      return worker;
    }
  });
  const mutations = new MutationObserver(() => {
    if (document.querySelector('[data-testid="dashboard-priority-panel"]')) {
      state.domReadyMs = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => { state.afterTwoFramesMs = performance.now(); }));
      mutations.disconnect();
    }
  });
  mutations.observe(document, { childList: true, subtree: true });
}

try {
  for (const count of counts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', serviceWorkers: 'block' });
    await context.addInitScript(observe);
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.setDefaultTimeout(120000);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => globalThis.dashboardProbe.workers.some(worker => worker.messages.some(message => message.status === 'loaded')));
    await page.evaluate(seed, { count });
    const nativeCounts = await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('consulting_math_drill_tool');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const result = {};
      for (const store of ['drill_sessions', 'responses']) {
        result[store] = await new Promise((resolve, reject) => {
          const request = db.transaction(store).objectStore(store).count();
          request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
      }
      db.close(); return result;
    });
    assert.deepEqual(nativeCounts, { drill_sessions: count, responses: count * 20 });
    const client = await context.newCDPSession(page);
    for (const rate of [1, 4]) {
      await client.send('Emulation.setCPUThrottlingRate', { rate });
      for (let trial = -1; trial < trials; trial++) {
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => Number.isFinite(globalThis.dashboardProbe.afterTwoFramesMs));
        const measurement = await page.evaluate(() => globalThis.dashboardProbe.finish());
        assert(measurement.domReadyMs > 0 && measurement.afterTwoFramesMs >= measurement.domReadyMs);
        assert(measurement.workers.some(worker => worker.messages.some(message => message.status === 'loaded')));
        if (trial >= 0) {
          const row = { count, rate, trial, ...measurement };
          report.rows.push(row); console.log(JSON.stringify(row));
          await writeFile(output, JSON.stringify(report, null, 2));
        }
      }
    }
    await context.close();
  }
  report.summaries = counts.flatMap(count => [1, 4].map(rate => {
    const rows = report.rows.filter(row => row.count === count && row.rate === rate);
    assert.equal(rows.length, trials);
    return { count, rate, trials, ...Object.fromEntries(
      ['domReadyMs', 'afterTwoFramesMs', 'longestTaskMs', 'blockingMs'].map(key => [key, median(rows.map(row => row[key]))])
    ) };
  }));
} finally {
  await browser.close();
  await writeFile(output, JSON.stringify(report, null, 2));
}
assert.deepEqual(report.errors, []);
assert.equal(report.rows.length, counts.length * 2 * trials);

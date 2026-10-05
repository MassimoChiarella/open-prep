import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import path from 'node:path';

// node src/tests/performance/audit-backup.mjs ORIGIN LABEL SESSIONS REPETITIONS [large-record]
// Normal: 1000 / 5; near-limit: 3700 / 0; oversized: 5000 / 0; large-record: 1 / 0 / large-record.
const origin = process.argv[2] ?? 'http://127.0.0.1:43124';
const label = process.argv[3] ?? 'baseline';
const count = Number(process.argv[4] ?? 1000);
const repetitions = Number(process.argv[5] ?? 5);
const variant = process.argv[6] ?? 'standard';
const output = path.resolve('.runtime-cache/performance');
await mkdir(output, { recursive: true });
const results = { origin, label, variant, sessions: count, responses: count * (variant === 'large-record' ? 250 : 20), trials: [] };
const browser = await chromium.launch({ headless: true });
results.environment = { node: process.version, browser: browser.version(), os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCpus: cpus().length };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  const releaseMarker = await context.request.get(origin + '/open-prep-release.json');
  if (releaseMarker.ok()) results.release = await releaseMarker.json();
  await page.goto(origin + '/settings/', { waitUntil: 'networkidle' });
  await page.getByText(/Built-in defaults initialize Drill Selection/).waitFor();
  await page.evaluate(async ({ count, variant }) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('consulting_math_drill_tool'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(['drill_sessions', 'responses'], 'readwrite');
    const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    for (let n = 0; n < count; n++) {
      const id = `audit-history-${n}`;
      const startedAt = new Date(Date.UTC(2024, 0, 1) + n * 3600000).toISOString();
      const questionCount = variant === 'large-record' ? 250 : 20;
      const endedAt = new Date(Date.parse(startedAt) + questionCount * 10000).toISOString();
      const questions = Array.from({ length: questionCount }, (_, j) => ({ id: `audit-question-${j}`, type: 'numeric', category: 'arithmetic', tags: ['addition'], difficulty: 'beginner', prompt: variant === 'large-record' ? `What is ${j + 10} + 20? `.padEnd(99000, 'x') : `What is ${j + 10} + 20?`, answer: { value: j + 30, unit: 'none' }, explanation: { short: 'Add the two values.', steps: [`${j + 10} + 20 = ${j + 30}.`] }, metadata: { sourceType: 'generated' } }));
      const responses = questions.map((q, j) => ({ questionId: q.id, rawInput: String(q.answer.value + (j % 5 === 0 ? 1 : 0)), normalizedValue: q.answer.value + (j % 5 === 0 ? 1 : 0), isCorrect: j % 5 !== 0, errorTypes: j % 5 === 0 ? ['arithmetic_error'] : ['none'], timeTakenSeconds: 10, submittedAt: new Date(Date.parse(startedAt) + (j + 1) * 10000).toISOString() }));
      const score = { totalScore: questionCount * 80, accuracy: 0.8, averageTimeSeconds: 10, correctCount: questionCount * 0.8, incorrectCount: questionCount * 0.2, categoryBreakdown: [{ category: 'arithmetic', accuracy: 0.8, averageTimeSeconds: 10, questionCount }], errorBreakdown: [{ errorType: 'arithmetic_error', count: questionCount * 0.2 }] };
      tx.objectStore('drill_sessions').put({ id, startedAt, endedAt, updatedAt: endedAt, settings: { categories: ['arithmetic'], difficulty: 'beginner', questionCount, timeMode: 'untimed', feedbackMode: 'instant' }, questionIds: questions.map(q => q.id), questions, responses, score });
      for (const response of responses) tx.objectStore('responses').put({ ...response, id: `${id}:${response.questionId}`, sessionId: id, category: 'arithmetic', tags: ['addition'] });
    }
    await done; db.close();
  }, { count, variant });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('settings-local-data').locator(':scope > summary').click();
  const prepare = page.getByRole('button', { name: 'Prepare Complete Backup', exact: true });
  await prepare.waitFor();
  const cdp = await context.newCDPSession(page);
  for (const cpu of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    for (let trial = 0; trial <= repetitions; trial++) {
      await page.evaluate(() => {
        const probe = window.backupProbe = { start: performance.now(), tasks: [], gaps: [], timerGaps: [] };
        probe.observer = new PerformanceObserver(list => probe.tasks.push(...list.getEntries().map(({ startTime, duration }) => ({ start: startTime, duration }))));
        probe.observer.observe({ type: 'longtask' });
        let frameAt = probe.start, timerAt = probe.start;
        const frame = () => { const now = performance.now(); probe.gaps.push(now - frameAt); frameAt = now; if (probe.busyPaintMs === undefined && document.querySelector('section[aria-labelledby="complete-backup-heading"] button')?.disabled) probe.busyPaintMs = now - probe.start; probe.frame = requestAnimationFrame(frame); };
        probe.frame = requestAnimationFrame(frame);
        probe.timer = setInterval(() => { const now = performance.now(); probe.timerGaps.push(now - timerAt); timerAt = now; }, 50);
        document.querySelector('section[aria-labelledby="complete-backup-heading"] button').click();
      });
      await page.getByTestId('complete-backup-export-preview').or(page.locator('section[aria-labelledby="complete-backup-heading"] [role="alert"]')).first().waitFor();
      const result = await page.evaluate(() => {
        const probe = window.backupProbe;
        probe.tasks.push(...probe.observer.takeRecords().map(({ startTime, duration }) => ({ start: startTime, duration })));
        probe.observer.disconnect(); clearInterval(probe.timer); cancelAnimationFrame(probe.frame);
        return { elapsedMs: performance.now() - probe.start, busyPaintMs: probe.busyPaintMs, maxTaskMs: Math.max(0, ...probe.tasks.map(task => task.duration)), maxFrameGapMs: Math.max(0, ...probe.gaps), maxHeartbeatGapMs: Math.max(0, ...probe.timerGaps), tasks: probe.tasks, preview: document.querySelector('[data-testid="complete-backup-export-preview"]')?.textContent ?? document.querySelector('section[aria-labelledby="complete-backup-heading"] [role="alert"]')?.textContent ?? '' };
      });
      results.trials.push({ cpu, trial, warmup: trial === 0, ...result });
      console.log(JSON.stringify({ cpu, trial, ...result, tasks: undefined }));
      await writeFile(path.join(output, `backup-${label}.json`), JSON.stringify(results, null, 2));
      if (!result.preview.startsWith('Complete backup preview')) break;
    }
  }
  await context.close();
} finally { await browser.close(); }

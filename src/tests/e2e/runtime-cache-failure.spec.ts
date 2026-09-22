import { expect, test } from "@playwright/test";

for (const operation of ["open", "put"] as const) {
  test(`successful downloads survive service-worker cache ${operation} failure`, async ({ context, page, request }) => {
    const pathname = "/question-pack-author-guide.md";
    const expected = await request.get(pathname);
    expect(expected.status()).toBe(200);
    const expectedBody = await expected.text();

    await page.goto("/");
    await page.evaluate(async () => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    const worker = context.serviceWorkers().find((candidate) => candidate.url().endsWith("/sw.js"));
    if (worker === undefined) throw new Error("The active service worker was not available.");

    await worker.evaluate((failedOperation) => {
      if (failedOperation === "open") {
        CacheStorage.prototype.open = async () => { throw new DOMException("Synthetic cache failure", "QuotaExceededError"); };
      } else {
        Cache.prototype.put = async () => { throw new DOMException("Synthetic cache failure", "QuotaExceededError"); };
      }
    }, operation);

    const actual = await page.evaluate(async (url) => {
      const response = await window.fetch(url);
      return { body: await response.text(), contentType: response.headers.get("content-type"), status: response.status };
    }, pathname);

    expect(actual).toEqual({ body: expectedBody, contentType: expected.headers()["content-type"], status: 200 });
  });
}

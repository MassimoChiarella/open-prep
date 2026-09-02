import { expect, test, type Locator } from "@playwright/test";

const layoutCases = [
  ...[320, 768, 1280].flatMap((width) =>
    (["light", "dark"] as const).map((theme) => ({ locale: "en", theme, width }))
  ),
  { locale: "de", theme: "dark", width: 320 },
  { locale: "ar", theme: "dark", width: 320 }
];

for (const layout of layoutCases) {
  test(`benchmark confirmation has breathing room at ${layout.width}px in ${layout.theme} ${layout.locale}`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: layout.width });
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("consulting_math_locale_preference", locale);
      localStorage.setItem("consulting_math_theme_preference", theme);
    }, layout);
    await page.goto("/benchmark");
    await expect(page.locator("html")).toHaveAttribute("lang", layout.locale);
    await expect(page.locator("html")).toHaveAttribute("dir", layout.locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("html")).toHaveAttribute("data-theme", layout.theme);

    const panel = page.getByTestId("benchmark-confirmation");
    await expect(panel).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    const begin = panel.getByRole("link");
    const controls = [
      ["heading", panel.getByRole("heading", { level: 2 })],
      ["timing group", panel.getByRole("group")],
      ["timing select", panel.getByRole("combobox")],
      ["remember timing row", panel.locator("label").filter({ has: page.getByRole("checkbox") })],
      ["begin action", begin]
    ] as const;

    for (const [name, control] of controls) {
      const insets = await insetsOf(control);
      expect(insets.left, `${name}: left inset`).toBeGreaterThanOrEqual(20);
      expect(insets.right, `${name}: right inset`).toBeGreaterThanOrEqual(20);
    }

    const introduction = await insetsOf(panel.locator(":scope > div").first());
    const beginInsets = await insetsOf(begin);
    expect(introduction.top, "top inset").toBeGreaterThanOrEqual(20);
    expect(beginInsets.bottom, "bottom inset").toBeGreaterThanOrEqual(20);
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth), "panel overflow")
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "page overflow")
      .toBe(true);
  });
}

test("the spaced benchmark panel preserves timing selection and starting a run", async ({ page }) => {
  await page.goto("/benchmark");
  const panel = page.getByTestId("benchmark-confirmation");
  const begin = panel.getByRole("link", { name: "Begin Benchmark" });
  await expect(begin).toHaveAttribute("href", /^\/benchmark\/session\/?\?benchmark=beginner$/);
  await panel.getByRole("combobox", { name: "Timing choice" }).selectOption("time_and_a_half");
  await expect(panel.getByRole("status")).toContainText("Your limit will be 30 min.");
  await expect(begin).toHaveAttribute(
    "href",
    /^\/benchmark\/session\/?\?benchmark=beginner&timingAccommodation=time_and_a_half$/
  );
  await panel.getByRole("checkbox", { name: "Remember this timing choice on this device" }).check();
  await begin.click();

  await expect(page).toHaveURL(/\/benchmark\/session\/?\?benchmark=beginner&timingAccommodation=time_and_a_half$/);
  await expect(page.getByTestId("active-timing-accommodation")).toContainText("Time and a half");
  await expect(page.getByText("Question 1 of 20", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("open_prep_timing_accommodation")))
    .toBe("time_and_a_half");
});

for (const locale of ["en", "de", "ar"]) {
  test(`@browser-smoke benchmark metric rows align with unequal ${locale} copy and fit narrow screens`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.addInitScript((language) => {
      localStorage.setItem("consulting_math_locale_preference", language);
    }, locale);
    await page.goto("/benchmark");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const cards = page.getByTestId(/^benchmark-card-/);
    await expect(cards).toHaveCount(4);
    await page.evaluate(async () => { await document.fonts.ready; });

    for (const copy of ["original", "longer"]) {
      if (copy === "longer") {
        // Stress wrapping with the existing localized copy; do not change app fixtures.
        await cards.evaluateAll((elements) => {
          const heading = elements[0].querySelector("h2");
          const description = elements[elements.length - 1].querySelector("p");
          if (heading === null || description === null) throw new Error("Missing benchmark copy.");
          heading.textContent = Array(3).fill(heading.textContent).join(" ");
          description.textContent = Array(4).fill(description.textContent).join(" ");
        });
      }

      const metrics = await cards.evaluateAll((elements) => {
        // Sample every card in one frame, relative to their shared container.
        const origin = elements[0].parentElement!.getBoundingClientRect().top;
        return elements.map((element) => Array.from(element.querySelectorAll("dl > div"), (metric) => {
          const bounds = metric.getBoundingClientRect();
          return { top: bounds.top - origin, bottom: bounds.bottom - origin };
        }));
      });
      for (const cardMetrics of metrics) expect(cardMetrics).toHaveLength(4);
      for (let metric = 0; metric < 4; metric += 1) {
        for (const edge of ["top", "bottom"] as const) {
          const positions = metrics.map((cardMetrics) => cardMetrics[metric][edge]);
          expect(Math.max(...positions) - Math.min(...positions), `${copy} metric ${metric} ${edge}`)
            .toBeLessThanOrEqual(1);
        }
      }
    }

    await page.setViewportSize({ height: 900, width: 320 });
    const containment = await cards.evaluateAll((elements) => ({
      pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      cardsFit: elements.every((element) => {
        const card = element.getBoundingClientRect();
        return element.scrollWidth <= element.clientWidth &&
          Array.from(element.querySelectorAll("dl > div")).every((metric) => {
            const bounds = metric.getBoundingClientRect();
            return bounds.left >= card.left && bounds.right <= card.right;
          });
      })
    }));
    expect(containment).toEqual({ pageFits: true, cardsFit: true });
  });
}

async function insetsOf(locator: Locator) {
  return locator.evaluate((element) => {
    const panel = element.closest('[data-testid="benchmark-confirmation"]');
    if (panel === null) throw new Error("Expected an element inside the benchmark confirmation.");
    // Read both boxes in one frame so page entry motion cannot skew the inset.
    const bounds = element.getBoundingClientRect();
    const panelBounds = panel.getBoundingClientRect();
    return {
      left: bounds.left - panelBounds.left,
      right: panelBounds.right - bounds.right,
      top: bounds.top - panelBounds.top,
      bottom: panelBounds.bottom - bounds.bottom
    };
  });
}

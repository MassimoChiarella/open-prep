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

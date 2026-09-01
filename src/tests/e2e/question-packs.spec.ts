import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

test("an installed exhibit pack opens in exhibit practice", async ({ page }) => {
  const card = await installExample(
    page,
    "question-pack-exhibit-example.mathdrill.json",
    "example-delivery-channel-exhibit",
    "Example Delivery Channel Exhibit"
  );

  await card.getByRole("link", { name: "Open Exhibits" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Example Delivery Channel Exhibit" })).toBeVisible();
  await expect(page.getByTestId("exhibit-question-prompt")).toContainText("completed orders");
});

test("an installed market-sizing pack opens in the guided form", async ({ page }) => {
  const card = await installExample(
    page,
    "question-pack-market-sizing-example.mathdrill.json",
    "example-neighborhood-market-sizing",
    "Example Neighborhood Market Sizing"
  );

  await card.getByRole("link", { name: "Open Market sizing" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Guided Market Sizing" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Neighborhood Delivery Spend" })).toBeAttached();
});

test("an installed benchmark pack opens a locked benchmark choice", async ({ page }) => {
  const card = await installExample(
    page,
    "question-pack-benchmark-example.mathdrill.json",
    "example-foundations-benchmark",
    "Example Foundations Benchmark"
  );

  await card.getByRole("link", { name: "Open Benchmarks" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Benchmark your performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Foundations Check" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin Benchmark" })).toHaveAttribute(
    "href",
    expect.stringContaining("pack=example-foundations-benchmark")
  );
});

test("an installed case-practice pack opens focused exercises and its full case", async ({ page }) => {
  const packId = "example-harborfresh-case-practice";
  const card = await installExample(
    page,
    "question-pack-case-practice-example.mathdrill.json",
    packId,
    "Example HarborFresh Case Practice"
  );

  await card.getByRole("link", { name: "Open Case practice" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Example HarborFresh Case Practice" })
  ).toBeVisible();

  const structuringLink = page.getByRole("link", { name: "Open Structuring" });
  await expect(structuringLink).toHaveAttribute("href", expect.stringContaining(`pack=${packId}`));
  await structuringLink.click();
  await expect(page.getByRole("heading", { level: 1, name: "Case structuring" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Diagnose a margin decline" })).toBeVisible();

  await page.getByRole("link", { name: "Back to Case Practice" }).click();
  const fullCaseLink = page.getByRole("link", { name: "Open Neighborhood pickup rollout" });
  await expect(fullCaseLink).toHaveAttribute("href", expect.stringContaining("case=question-pack%3A"));
  await fullCaseLink.click();
  await expect(page.getByRole("heading", { level: 1, name: "Full Case Simulation" })).toBeVisible();
  await expect(page.getByText("Neighborhood pickup rollout", { exact: true })).toBeVisible();
});

test("an installed version-three pack opens questioning practice", async ({ page }) => {
  const packId = "customer-retention-questioning";
  const card = await installExample(
    page,
    "question-pack-case-questioning-example.mathdrill.json",
    packId,
    "Customer Retention Questioning"
  );

  await card.getByRole("link", { name: "Open Case practice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Customer Retention Questioning" })).toBeVisible();

  const questioningLink = page.getByRole("link", { name: "Open Questioning" });
  await expect(questioningLink).toHaveAttribute("href", expect.stringContaining(`pack=${packId}`));
  await questioningLink.click();
  await expect(page.getByRole("heading", { level: 1, name: "Questioning practice" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Northline Software Churn" })).toBeAttached();
  await expect(page.getByText(/monthly customer churn rise from 2% to 5%/)).toBeVisible();
});

test("saved question-pool modes govern regular numeric and exhibit drills", async ({ page }) => {
  await installExample(
    page,
    "question-pack-example.mathdrill.json",
    "example-retail-practice",
    "Example Retail Practice"
  );
  await installExample(
    page,
    "question-pack-exhibit-example.mathdrill.json",
    "example-delivery-channel-exhibit",
    "Example Delivery Channel Exhibit"
  );

  await page.goto("/settings#question-pool-settings");
  await page.getByRole("radio", { name: /Selected packs only/ }).check();
  await page.getByRole("checkbox", { name: /Example Retail Practice/ }).check();
  await page.getByRole("checkbox", { name: /Example Delivery Channel Exhibit/ }).check();
  await page.getByRole("button", { name: "Save Question Pool" }).click();
  await expect(page.getByText("Question pool saved on this device.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: /Selected packs only/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Example Retail Practice/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Example Delivery Channel Exhibit/ })).toBeChecked();

  await page.goto(
    "/drills/session?categories=business_math&tags=revenue&difficulty=beginner&count=1&seed=selected-pool-e2e"
  );
  await expect(page.getByTestId("active-question-prompt")).toContainText(
    "fictional retailer sells 24,000 annual subscriptions"
  );

  await page.goto("/exhibits");
  await expect(page.getByRole("heading", { level: 1, name: "Example Delivery Channel Exhibit" })).toBeVisible();
  await expect(page.getByTestId("exhibit-select").getByRole("option")).toHaveCount(1);

  await page.goto("/settings#question-pool-settings");
  await page.getByRole("radio", { name: /Built-in and selected packs/ }).check();
  await page.getByRole("button", { name: "Save Question Pool" }).click();
  await expect(page.getByText("Question pool saved on this device.")).toBeVisible();

  await page.goto("/exhibits");
  const exhibits = page.getByTestId("exhibit-select");
  await expect(exhibits.getByRole("option", { name: "Retail Format Economics" })).toBeAttached();
  await expect(exhibits.getByRole("option", { name: "Orders by Delivery Channel" })).toBeAttached();
});

async function installExample(page: Page, fileName: string, packId: string, title: string) {
  await page.goto("/content-packs?view=import");
  await page
    .getByLabel("Choose a question pack")
    .setInputFiles(resolve(process.cwd(), "public", fileName));
  await expect(page.getByTestId("question-pack-preview")).toContainText(title);
  await page.getByRole("checkbox", { name: /I reviewed the answer keys/ }).check();
  await page.getByRole("button", { name: "Install Pack" }).click();
  await expect(page.getByText("Question pack installed on this device.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Installed", exact: true }).click();
  const card = page.getByTestId(`question-pack-${packId}`);
  await expect(card).toBeVisible();
  return card;
}

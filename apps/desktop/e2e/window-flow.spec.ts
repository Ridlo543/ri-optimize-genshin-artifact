import { fileURLToPath } from "node:url";
import { expect, Page, test } from "@playwright/test";

const goodFixturePath = fileURLToPath(new URL("../../../data/fixtures/good/artifact-samples.json", import.meta.url));

async function computedBackgrounds(page: Page) {
  return page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
    root: getComputedStyle(document.querySelector("#root")!).backgroundColor
  }));
}

test("overlay and assistant routes keep every root layer transparent", async ({ page }, testInfo) => {
  await page.goto("/?window=roi-overlay");
  await expect.poll(() => computedBackgrounds(page)).toEqual({
    html: "rgba(0, 0, 0, 0)",
    body: "rgba(0, 0, 0, 0)",
    root: "rgba(0, 0, 0, 0)"
  });

  await page.goto("/?window=assistant-bubble");
  await expect.poll(() => computedBackgrounds(page)).toEqual({
    html: "rgba(0, 0, 0, 0)",
    body: "rgba(0, 0, 0, 0)",
    root: "rgba(0, 0, 0, 0)"
  });

  const launcher = page.locator(".assistant-launcher");
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveCSS("border-radius", "50%");
  await expect(launcher.locator(".assistant-logo-mark")).toBeVisible();
  await expect(launcher.locator(".lucide-triangle-alert")).toHaveCount(0);
  await expect.poll(() => launcher.textContent()).toBe("");
  const bounds = await launcher.boundingBox();
  expect(bounds?.width).toBe(58);
  expect(bounds?.height).toBe(58);
  await page.screenshot({ path: testInfo.outputPath("assistant-collapsed.png"), omitBackground: true });

  await launcher.click();
  await expect(page.locator(".assistant-bubble")).toBeVisible();
  await expect(page.locator(".assistant-bubble")).toHaveCSS("border-top-width", "0px");
  await expect(page.getByRole("button", { name: "Minimize to bubble" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimize to bubble" }).locator(".assistant-collapse-icon")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("assistant-expanded.png"), omitBackground: true });

  await page.getByRole("button", { name: "Minimize to bubble" }).click();
  await expect(launcher).toBeVisible();
  await expect(page.locator(".assistant-bubble")).toHaveCount(0);
});

test("assistant collapsed launcher fits a high-DPI shrunken viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 48, height: 48 });
  await page.goto("/?window=assistant-bubble");

  const launcher = page.locator(".assistant-launcher");
  await expect(launcher).toBeVisible();
  await expect(launcher.locator(".assistant-logo-mark")).toBeVisible();
  await expect(launcher.locator(".lucide-triangle-alert")).toHaveCount(0);
  await expect.poll(() => launcher.textContent()).toBe("");
  const bounds = await launcher.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(48);
  expect(bounds!.height).toBeLessThanOrEqual(48);

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.scrollWidth - window.innerWidth
  }));
  expect(overflow.document).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath("assistant-collapsed-48px.png"), omitBackground: true });
});

test("dragging the collapsed launcher does not accidentally open the menu", async ({ page }) => {
  await page.goto("/?window=assistant-bubble");
  const launcher = page.locator(".assistant-launcher");
  const bounds = await launcher.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 12, bounds!.y + bounds!.height / 2 + 12);
  await page.mouse.up();

  await expect(launcher).toBeVisible();
  await expect(page.locator(".assistant-bubble")).toHaveCount(0);
});

test("fixture playground ROI can resize and lock", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?window=fixture-playground&fixture=character-plus20");
  await expect(page.locator(".fixture-stage__image")).toBeVisible();

  const roi = page.locator(".roi-box");
  const handle = page.locator(".roi-handle--se");
  const before = await roi.boundingBox();
  const handleBounds = await handle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBounds).not.toBeNull();

  await page.mouse.move(handleBounds!.x + handleBounds!.width / 2, handleBounds!.y + handleBounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBounds!.x + 45, handleBounds!.y + 35);
  await page.mouse.up();

  const after = await roi.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  expect(after!.height).toBeGreaterThan(before!.height);
  await page.screenshot({ path: testInfo.outputPath("roi-edit.png") });

  await page.getByRole("button", { name: "Lock ROI" }).click();
  await expect(page.locator(".roi-handle")).toHaveCount(0);
});

test("main panel imports GOOD artifact samples through the Import control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await page.getByRole("button", { name: "Developer tools" }).click();
  await page.locator('input[type="file"]').setInputFiles(goodFixturePath);

  await expect(page.getByText("Batch import ready")).toBeVisible();
  await expect(page.getByText("Total")).toBeVisible();
  await expect(page.getByText("Evaluated")).toBeVisible();
  await expect(page.getByText("Warnings")).toBeVisible();
});

test("beginner-facing metrics expose keyboard-accessible explanations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Developer tools" }).click();
  await page.getByRole("button", { name: "Fixture", exact: true }).click();

  await expect(page.getByRole("button", { name: /Active Crit Value:/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chance to Reach Target:/ })).toBeVisible();
  const activeCvHelp = page.getByRole("button", { name: /Active Crit Value:/ });
  await activeCvHelp.focus();
  await expect.poll(() => page.getByRole("tooltip").first().evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
});

for (const viewport of [
  { width: 420, height: 720 },
  { width: 1280, height: 800 }
]) {
  test(`main panel has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".shell")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth
    }));
    expect(overflow.document).toBeLessThanOrEqual(0);
    expect(overflow.body).toBeLessThanOrEqual(0);
  });
}

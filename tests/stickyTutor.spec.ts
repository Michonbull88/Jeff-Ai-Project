import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 800 } });

for (const route of [
  "/excel",
  "/web-development",
  "/chatgpt-basics",
  "/computer-basics",
]) {
  test(`JEFF follows the learner while scrolling on ${route}`, async ({ page }) => {
    await page.route("**/api/status", (request) =>
      request.fulfill({
        json: { configured: false, locked: false, localSpeechAvailable: true },
      }),
    );
    await page.goto(route);
    const companion = page.locator(
      route === "/excel" ? ".excel-jeff-companion" : ".web-jeff-companion",
    );
    await expect(companion).toBeVisible();
    await expect(companion.locator("h2")).toHaveCount(0);
    expect(await companion.evaluate((element) => getComputedStyle(element).zIndex)).toBe("30");
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect
      .poll(async () => Math.round((await companion.boundingBox())?.y || 0))
      .toBe(16);
  });
}

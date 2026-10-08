import { test, expect } from "@playwright/test";

for (const path of [
  "/excel",
  "/web-development",
  "/chatgpt-basics",
  "/computer-basics",
]) {
  test(`speech preference waits for saved settings on ${path}`, async ({
    page,
  }) => {
    let releaseScripts!: () => void;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/**", async (route) => {
      if (route.request().resourceType() === "script") await scriptsReady;
      await route.continue();
    });
    await page.route("**/api/status", (route) =>
      route.fulfill({ json: { configured: false, locked: false } }),
    );
    const preference = page.getByLabel("Speak answers aloud");
    try {
      await page.goto(path, { waitUntil: "commit" });
      // Server-rendered controls must wait for the browser's saved state.
      await expect(preference).toBeVisible();
      await expect(preference).toBeDisabled();
    } finally {
      releaseScripts();
    }
    await expect(preference).toBeEnabled();
    await preference.uncheck();
    await expect(preference).not.toBeChecked();
    await page.reload();
    await expect(preference).toBeEnabled();
    await expect(preference).not.toBeChecked();
  });
}

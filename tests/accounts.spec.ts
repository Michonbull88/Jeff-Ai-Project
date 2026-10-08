import { expect, test } from "@playwright/test";
import { issueUserSession, sessionCookie } from "../lib/authToken";

test("login page offers login and account creation", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your JEFF account." })).toBeVisible();
  await expect(page.getByText(/first account created becomes the administrator/i)).toBeVisible();
});

test("learner accounts cannot add or remove course documents", async ({ page, request }) => {
  const token = issueUserSession("learner-test", "learner");
  await page.context().addCookies([{ name: sessionCookie, value: token, url: "http://127.0.0.1:3000" }]);
  await page.goto("/chatgpt-basics");
  await expect(page.getByRole("heading", { name: "Course documents" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add documents" })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  const response = await request.delete("/api/chatgpt-documents?id=00000000-0000-0000-0000-000000000000", {
    headers: { cookie: `${sessionCookie}=${token}`, origin: "http://127.0.0.1:3000", "x-jeff-e2e": "0" },
  });
  expect(response.status()).toBe(403);
});

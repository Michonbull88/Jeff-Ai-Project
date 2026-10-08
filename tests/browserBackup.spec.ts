import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  createBrowserBackup,
  parseBrowserBackup,
  restoreBrowserBackup,
} from "../lib/browserBackup";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
}

test("backup includes only JEFF records and refuses unsupported imports", () => {
  const source = storage({
    "jeff-settings": '{"intensity":0.5}',
    "jeff-tutor-history-v1:computer:11:keyboard": "[]",
    "another-app": "private",
    "jeff-unknown": "ignore",
  });
  const backup = createBrowserBackup(source);
  expect(backup.entries).toEqual({
    "jeff-settings": '{"intensity":0.5}',
    "jeff-tutor-history-v1:computer:11:keyboard": "[]",
  });
  expect(() =>
    parseBrowserBackup(
      JSON.stringify({ ...backup, entries: { "another-app": "changed" } }),
    ),
  ).toThrow("unsupported records");
  expect(() =>
    parseBrowserBackup(
      JSON.stringify({ ...backup, entries: { "jeff-settings": 123 } }),
    ),
  ).toThrow("unsupported records");
  expect(() => parseBrowserBackup("not JSON")).toThrow("not readable JSON");
  expect(() =>
    parseBrowserBackup(JSON.stringify({ ...backup, version: 2 })),
  ).toThrow("not a supported");
});

test("a failed restore rolls back previous values and removes partially added records", () => {
  const target = storage({
    "jeff-settings": "old",
    "another-app": "untouched",
  });
  const set = target.setItem;
  let writes = 0;
  target.setItem = (key, value) => {
    if (++writes === 3) throw new Error("QuotaExceededError");
    set(key, value);
  };
  const backup = createBrowserBackup(
    storage({
      "jeff-settings": "new",
      "jeff-computer-basics-v1": "new notes",
      "jeff-excel-spoken-answers": "false",
    }),
  );
  expect(() => restoreBrowserBackup(target, backup)).toThrow(
    "Previous records were restored",
  );
  expect(target.getItem("jeff-settings")).toBe("old");
  expect(target.getItem("jeff-computer-basics-v1")).toBeNull();
  expect(target.getItem("another-app")).toBe("untouched");
});

test("browser progress downloads and restores into a usable course", async ({
  page,
}) => {
  await page.goto("/transfer");
  const progress = {
    current: "keyboard",
    completed: ["keyboard"],
    version: "11",
    notes: { keyboard: "Practise capital letters." },
    spoken: false,
  };
  await page.evaluate((saved) => {
    localStorage.setItem("jeff-computer-basics-v1", JSON.stringify(saved));
    localStorage.setItem("another-app", "keep private");
  }, progress);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JEFF backup" }).click();
  const download = await downloading;
  const contents = await readFile((await download.path())!, "utf8");
  expect(contents).not.toContain("keep private");
  await page.evaluate(() => localStorage.removeItem("jeff-computer-basics-v1"));
  await page.getByLabel("Choose your JEFF backup (.json)").setInputFiles({
    name: "jeff-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
  await page.getByRole("button", { name: "Restore this backup" }).click();
  await expect(page.getByRole("status")).toContainText("Backup restored");
  expect(await page.evaluate(() => localStorage.getItem("another-app"))).toBe(
    "keep private",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/computer-basics");
  await expect(
    page.getByText("1 / 24 checks complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Your lesson notes", { exact: true }),
  ).toHaveValue("Practise capital letters.");
});

test("invalid backup is explained without changing saved records", async ({
  page,
}) => {
  await page.goto("/transfer");
  await page.evaluate(() =>
    localStorage.setItem("jeff-settings", '{"intensity":0.7}'),
  );
  await page.getByLabel("Choose your JEFF backup (.json)").setInputFiles({
    name: "wrong.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"another-app"}'),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "not a supported JEFF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore this backup" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("jeff-settings"))).toBe(
    '{"intensity":0.7}',
  );
});

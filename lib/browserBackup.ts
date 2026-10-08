const keys = new Set([
  "jeff-settings",
  "jeff-excel-progress-v1",
  "jeff-excel-spoken-answers",
  "jeff-web-development-v1",
  "jeff-chatgpt-basics-v1",
  "jeff-computer-basics-v1",
]);
export const backupLimit = 10 * 1024 * 1024;
export type BrowserBackup = {
  format: "jeff-browser-backup";
  version: 1;
  exportedAt: string;
  entries: Record<string, string>;
};

function supportedKey(key: string) {
  return keys.has(key) || /^jeff-tutor-history-v1:[a-zA-Z0-9:_-]+$/.test(key);
}

export function createBrowserBackup(storage: Storage): BrowserBackup {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !supportedKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return {
    format: "jeff-browser-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export function parseBrowserBackup(text: string): BrowserBackup {
  if (text.length > backupLimit)
    throw new Error(
      "This backup is too large. Choose a JEFF browser backup under 10 MB.",
    );
  let value: BrowserBackup;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This file is not readable JSON. Choose a backup downloaded from JEFF.",
    );
  }
  if (
    !value ||
    value.format !== "jeff-browser-backup" ||
    value.version !== 1 ||
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !value.entries ||
    typeof value.entries !== "object" ||
    Array.isArray(value.entries)
  )
    throw new Error("This is not a supported JEFF browser backup.");
  const entries = Object.entries(value.entries);
  if (
    entries.length > 1000 ||
    entries.some(
      ([key, entry]) => !supportedKey(key) || typeof entry !== "string",
    )
  )
    throw new Error(
      "The backup contains unsupported records. Choose an original JEFF backup.",
    );
  return value;
}

export function restoreBrowserBackup(storage: Storage, backup: BrowserBackup) {
  const entries = Object.entries(
    parseBrowserBackup(JSON.stringify(backup)).entries,
  );
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  try {
    for (const [key, value] of entries) storage.setItem(key, value);
  } catch {
    try {
      for (const [key, value] of previous)
        if (value === null) storage.removeItem(key);
      for (const [key, value] of previous)
        if (value !== null) storage.setItem(key, value);
    } catch {
      throw new Error(
        "Browser storage failed during restoration. Some records may have changed. Keep your backup file and free browser storage before trying again.",
      );
    }
    throw new Error(
      "There was not enough browser storage to restore this backup. Previous records were restored. Keep your backup file and free some space before trying again.",
    );
  }
}

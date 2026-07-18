import { db } from "@/lib/db";

const TABLE_NAMES = db.tables.map((t) => t.name);

export async function exportAllDataAsJSON(): Promise<string> {
  const dump: Record<string, unknown[]> = {};
  for (const name of TABLE_NAMES) {
    dump[name] = await db.table(name).toArray();
  }
  return JSON.stringify(
    { app: "lifeos", version: 1, exportedAt: new Date().toISOString(), data: dump },
    null,
    2
  );
}

export function downloadJSON(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAllDataFromJSON(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  if (parsed?.app !== "lifeos" || !parsed?.data) {
    throw new Error("This file doesn't look like a LifeOS backup.");
  }

  await db.transaction("rw", db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const rows = parsed.data[name];
      if (!Array.isArray(rows)) continue;
      await db.table(name).clear();
      if (rows.length) await db.table(name).bulkAdd(rows);
    }
  });
}

export async function resetAllData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    for (const name of TABLE_NAMES) {
      await db.table(name).clear();
    }
  });
}

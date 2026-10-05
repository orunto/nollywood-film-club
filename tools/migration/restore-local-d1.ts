import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Restore a downloaded SQL snapshot into an explicitly selected local D1.
// Take a Wrangler --local SQL export before running this command.
const [sourcePath, localPath] = process.argv.slice(2);
if (!sourcePath || !localPath) {
  throw new Error("Usage: tsx tools/migration/restore-local-d1.ts snapshot.sql .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<id>.sqlite");
}
const source = resolve(sourcePath);
const destination = resolve(localPath);
const localRoot = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
const localRelative = relative(localRoot, destination);
assert.ok(localRelative && !localRelative.startsWith("..") && !isAbsolute(localRelative), "Destination must be local Wrangler D1 storage");
assert.ok(destination.endsWith(".sqlite") && !destination.endsWith("metadata.sqlite"), "Select the application database, not persistence metadata");
assert.notEqual(source, destination);

const sql = await readFile(source, "utf8");
const snapshot = new DatabaseSync(":memory:");
const database = new DatabaseSync(destination, { open: false });
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
try {
  // Validate the source first. D1 SQL exports may create referencing tables
  // before their parents, so foreign keys are checked after the import.
  snapshot.exec("PRAGMA foreign_keys = OFF");
  snapshot.exec(sql);
  assert.equal(snapshot.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
  assert.deepEqual(snapshot.prepare("PRAGMA foreign_key_check").all(), []);
  const tables = snapshot.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  database.open();
  database.exec("PRAGMA busy_timeout = 10000; PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE");
  const existing = database.prepare("SELECT type, name FROM sqlite_master WHERE type IN ('view', 'table') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY CASE type WHEN 'view' THEN 0 ELSE 1 END").all() as { type: string; name: string }[];
  for (const { type, name } of existing) database.exec(`DROP ${type.toUpperCase()} ${quote(name)}`);
  database.exec(sql);
  assert.equal(database.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  for (const { name } of tables) {
    const countSql = `SELECT COUNT(*) AS n FROM ${quote(name)}`;
    assert.equal(database.prepare(countSql).get()?.n, snapshot.prepare(countSql).get()?.n, `Count differs for ${name}`);
  }
  assert.deepEqual(database.prepare("SELECT * FROM user_ratings ORDER BY id").all(), snapshot.prepare("SELECT * FROM user_ratings ORDER BY id").all());
  database.exec("COMMIT; PRAGMA foreign_keys = ON");
  console.log(JSON.stringify({ restored: true, source, destination, tables: tables.length, ratingsPreserved: true }, null, 2));
} catch (error) {
  if (database.isOpen && database.isTransaction) database.exec("ROLLBACK");
  throw error;
} finally {
  snapshot.close();
  if (database.isOpen) database.close();
}

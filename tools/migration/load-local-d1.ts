import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const stateDirectory = resolve(
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);
const databaseFiles = (await readdir(stateDirectory)).filter(
  (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
);
assert.equal(
  databaseFiles.length,
  1,
  "Expected exactly one local D1 database file",
);

const databasePath = resolve(stateDirectory, databaseFiles[0]);
const importSql = await readFile(
  resolve("data/migration/sqlite-import.sql"),
  "utf8",
);
const database = new DatabaseSync(databasePath);

try {
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(importSql);
  const violations = database.prepare("PRAGMA foreign_key_check").all();
  assert.deepEqual(violations, []);
} finally {
  database.close();
}

console.log(
  JSON.stringify({
    message: "Local D1 data import complete",
    databasePath,
  }),
);

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";

const [sqlPath = "data/migration/d1-export.sql", databasePath = "data/restore/nollywood-film-club.sqlite"] = process.argv.slice(2);
const source = resolve(sqlPath);
const destination = resolve(databasePath);
await mkdir(dirname(destination), { recursive: true });
try { await copyFile(destination, `${destination}.bak`); } catch { /* first restore */ }
const database = new DatabaseSync(destination);
try {
  database.exec("PRAGMA foreign_keys = OFF");
  database.exec("BEGIN");
  database.exec(await readFile(source, "utf8"));
  database.exec("COMMIT");
  database.exec("PRAGMA foreign_keys = ON");
  const result = database.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  if (result.integrity_check !== "ok") throw new Error(`SQLite integrity check failed: ${result.integrity_check}`);
  console.log(JSON.stringify({ restored: true, source, destination }));
} catch (error) {
  if (database.isTransaction) database.exec("ROLLBACK");
  throw error;
} finally { database.close(); }

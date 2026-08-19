import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { requireEnvironment } from "./environment";
import { checksum, writeJsonAtomic } from "./io";

const tables = [
  "users",
  "content",
  "discussions",
  "user_ratings",
  "reviews",
  "comments",
  "reports",
  "contact_messages",
  "blog_posts",
] as const;
const outputDirectory = resolve("data/migration/neon");
const pageSize = 500;
const sql = neon(requireEnvironment("DATABASE_URL"), {
  fullResults: true,
  readOnly: true,
});
const manifest: Record<
  string,
  { rowCount: number; checksum: string; file: string }
> = {};

async function query(statement: string, parameters: unknown[] = []) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const result = await sql.query(statement, parameters);
      return result.rows as Record<string, unknown>[];
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, attempt * 1_000),
      );
    }
  }
  throw new Error("Neon query retry loop exited unexpectedly");
}

for (const table of tables) {
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await query(
      `SELECT * FROM public."${table}" ORDER BY id LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  const serialized = `${JSON.stringify(rows, null, 2)}\n`;
  const file = `${table}.json`;
  await writeJsonAtomic(resolve(outputDirectory, file), rows);
  manifest[table] = {
    rowCount: rows.length,
    checksum: checksum(serialized),
    file,
  };
}

await writeJsonAtomic(resolve(outputDirectory, "manifest.json"), {
  generatedAt: new Date().toISOString(),
  pageSize,
  tables: manifest,
});

console.log(
  JSON.stringify({
    message: "Neon data export complete",
    tableCount: tables.length,
    rowCount: Object.values(manifest).reduce(
      (total, table) => total + table.rowCount,
      0,
    ),
  }),
);

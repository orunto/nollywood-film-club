import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { contentSlug } from "../../src/lib/utils";

const execFileAsync = promisify(execFile);
const remote = process.argv.includes("--remote");
const envIndex = process.argv.indexOf("--env");
const env = envIndex === -1 ? undefined : process.argv[envIndex + 1];

if (envIndex !== -1 && !env) {
  throw new Error("--env requires an environment name");
}

const flags = ["d1", "execute", "DB", "--json"];
if (remote) flags.push("--remote");
else flags.push("--local");
if (env) flags.push("--env", env);

async function execute(command: string) {
  const { stdout } = await execFileAsync(process.execPath, [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    ...flags,
    "--command",
    command,
  ]);
  const json = stdout.slice(stdout.indexOf("[")).trim();
  return JSON.parse(json) as Array<{ results: Array<Record<string, unknown>> }>;
}

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const result = await execute("SELECT id, title, content_type, release_date FROM content ORDER BY id");
const rows = result[0]?.results ?? [];
const seen = new Set<string>();

for (const row of rows) {
  const releaseDate = row.release_date === null ? null : new Date(Number(row.release_date));
  const key = `${row.content_type}:${contentSlug(String(row.title), releaseDate)}`;
  if (seen.has(key)) throw new Error(`Canonical slug collision: ${key}`);
  seen.add(key);
}

for (let index = 0; index < rows.length; index += 50) {
  const updates = rows.slice(index, index + 50).map((row) => {
    const id = String(row.id);
    const title = String(row.title);
    const releaseDate = row.release_date === null ? null : new Date(Number(row.release_date));
    const slug = contentSlug(title, releaseDate);
    return `UPDATE content SET slug = ${quote(slug)} WHERE id = ${quote(id)}`;
  });
  await execute(updates.join("; "));
}

console.log(JSON.stringify({ updated: rows.length, remote, env: env ?? null }));

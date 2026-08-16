import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const outputPath = resolve(
  process.env.NEON_INTROSPECTION_OUTPUT ??
    "data/migration/neon-schema.json",
);
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

const sql = neon(connectionString, { fullResults: true });

async function query<TRow extends Record<string, unknown>>(statement: string) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const result = await sql.query(statement);
      return result.rows as TRow[];
    } catch (error) {
      if (attempt === 5) {
        throw error;
      }
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, attempt * 1_000),
      );
    }
  }

  throw new Error("Neon query retry loop exited unexpectedly");
}

  const [database, columns, enums, constraints, indexes] = await Promise.all([
    query<{
      database: string;
      schema: string;
      postgresVersion: string;
      timezone: string;
    }>(`
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        current_setting('server_version') AS "postgresVersion",
        current_setting('TimeZone') AS timezone
    `),
    query<{
      schemaName: string;
      tableName: string;
      columnName: string;
      ordinalPosition: number;
      dataType: string;
      udtName: string;
      nullable: "YES" | "NO";
      defaultValue: string | null;
    }>(`
      SELECT
        table_schema AS "schemaName",
        table_name AS "tableName",
        column_name AS "columnName",
        ordinal_position AS "ordinalPosition",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS nullable,
        column_default AS "defaultValue"
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `),
    query<{
      enumName: string;
      value: string;
      sortOrder: number;
    }>(`
      SELECT
        type.typname AS "enumName",
        enum.enumlabel AS value,
        enum.enumsortorder AS "sortOrder"
      FROM pg_type AS type
      JOIN pg_enum AS enum ON enum.enumtypid = type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = 'public'
      ORDER BY type.typname, enum.enumsortorder
    `),
    query<{
      tableName: string;
      constraintName: string;
      constraintType: string;
      definition: string;
    }>(`
      SELECT
        rel.relname AS "tableName",
        con.conname AS "constraintName",
        con.contype AS "constraintType",
        pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint AS con
      JOIN pg_class AS rel ON rel.oid = con.conrelid
      JOIN pg_namespace AS nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
      ORDER BY rel.relname, con.conname
    `),
    query<{
      tableName: string;
      indexName: string;
      definition: string;
    }>(`
      SELECT
        tablename AS "tableName",
        indexname AS "indexName",
        indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `),
  ]);

  const columnsByTable = Map.groupBy(
    columns,
    (column) => column.tableName,
  );
  const distributions: Record<
    string,
    { rowCount: number; nullCounts: Record<string, number> }
  > = {};

  for (const [tableName, tableColumns] of columnsByTable) {
    const nullSelections = tableColumns
      .map(
        (column) =>
          `count(*) FILTER (WHERE ${quoteIdentifier(column.columnName)} IS NULL)::integer AS ${quoteIdentifier(column.columnName)}`,
      )
      .join(",\n");
    const rows = await query<Record<string, number>>(`
      SELECT
        count(*)::integer AS "__rowCount",
        ${nullSelections}
      FROM ${quoteIdentifier("public")}.${quoteIdentifier(tableName)}
    `);
    const row = rows[0];
    const { __rowCount, ...nullCounts } = row;
    distributions[tableName] = { rowCount: __rowCount, nullCounts };
  }

  const [ratingDistribution, integrity] = await Promise.all([
    query<{ value: number | null; count: number }>(`
      SELECT rating AS value, count(*)::integer AS count
      FROM user_ratings
      GROUP BY rating
      ORDER BY rating
    `),
    query<{
      orphanRatings: number;
      duplicateRatings: number;
      movieOfTheWeekRows: number;
      usernameCollisionGroups: number;
    }>(`
      SELECT
        (
          SELECT count(*)::integer
          FROM user_ratings AS rating
          LEFT JOIN content ON content.id = rating.content_id
          WHERE content.id IS NULL
        ) AS "orphanRatings",
        (
          SELECT count(*)::integer
          FROM (
            SELECT content_id, user_id
            FROM user_ratings
            GROUP BY content_id, user_id
            HAVING count(*) > 1
          ) AS duplicates
        ) AS "duplicateRatings",
        (
          SELECT count(*)::integer
          FROM content
          WHERE is_movie_of_the_week
        ) AS "movieOfTheWeekRows",
        (
          SELECT count(*)::integer
          FROM (
            SELECT lower(username)
            FROM users
            WHERE username IS NOT NULL
            GROUP BY lower(username)
            HAVING count(*) > 1
          ) AS collisions
        ) AS "usernameCollisionGroups"
    `),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    source: database[0],
    tables: [...columnsByTable.keys()],
    columns,
    enums,
    constraints,
    indexes,
    distributions,
    valueDistributions: {
      userRatingsRating: ratingDistribution,
    },
    integrity: integrity[0],
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      message: "Neon schema introspection complete",
      outputPath,
      tableCount: report.tables.length,
    }),
  );

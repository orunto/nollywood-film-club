import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checksum, writeJsonAtomic, writeTextAtomic } from "./io";
import {
  planHexclaveImport,
  readHexclaveExport,
  type ExistingUser,
  type HexclaveExportUser,
} from "./import-hexclave-users";

// Postgres-to-SQLite transformation for the new canonical schema. The neon
// exports (data/migration/neon/*.json) and the Hexclave user export
// (data/migration/hexclave/users.json) are normalized into the same SQLite
// tables the runtime uses, and the result is rendered as a single
// transactional SQL file that load-local-d1.ts applies to the target.
//
// User rows intentionally flow through planHexclaveImport so this command
// cannot drift from import-hexclave-users.ts: emails collide fatally, usernames
// are stored lowercased, and a case-insensitive username conflict drops the
// incoming username instead of failing the whole run.

export type NeonRow = Record<string, unknown>;

export interface TableDefinition {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface SqliteImportInput {
  userMirrors: ExistingUser[];
  hexclaveUsers: HexclaveExportUser[];
  content: NeonRow[];
  discussions: NeonRow[];
  ratings: NeonRow[];
  reviews: NeonRow[];
  comments: NeonRow[];
  reports: NeonRow[];
  contacts: NeonRow[];
  blogPosts: NeonRow[];
}

export interface SqliteImportPlan {
  definitions: TableDefinition[];
  claims: Record<string, unknown>[];
  usernameDropped: string[];
  rowCounts: Record<string, number>;
}

const USER_COLUMNS = [
  "id",
  "name",
  "email",
  "email_verified",
  "image",
  "username",
  "role",
  "regular",
  "created_at",
  "updated_at",
] as const;
const CONTENT_COLUMNS = [
  "id",
  "title",
  "content_type",
  "runtime",
  "release_date",
  "rating",
  "synopsis",
  "genre",
  "poster_media_id",
  "poster_image",
  "poster_version",
  "trailer_url",
  "streaming_url",
  "streaming_platform",
  "other_platform",
  "viewing_category",
  "cast_members",
  "is_movie_of_the_week",
  "catalog_number",
  "created_at",
  "updated_at",
] as const;
const MEDIA_COLUMNS = [
  "id",
  "object_key",
  "public_id",
  "version",
  "mime_type",
  "width",
  "height",
  "byte_size",
  "checksum",
  "status",
  "original_provider",
  "original_metadata",
  "created_at",
  "updated_at",
] as const;
const DISCUSSION_COLUMNS = [
  "id",
  "title",
  "description",
  "content_id",
  "space_url",
  "podcast_links",
  "episode_number",
  "discussion_date",
  "created_at",
  "updated_at",
] as const;
const RATING_COLUMNS = [
  "id",
  "content_id",
  "user_id",
  "rating",
  "review",
  "edited",
  "flagged",
  "restricted",
  "created_at",
  "updated_at",
] as const;
const REVIEW_COLUMNS = [
  "id",
  "content_id",
  "title",
  "description",
  "score_tenths",
  "reviewer",
  "external_url",
  "review_media_id",
  "review_image",
  "published_at",
  "created_at",
  "updated_at",
] as const;
const COMMENT_COLUMNS = [
  "id",
  "review_id",
  "parent_id",
  "user_id",
  "body",
  "depth",
  "flagged",
  "restricted",
  "created_at",
  "updated_at",
] as const;
const REPORT_COLUMNS = [
  "id",
  "target_type",
  "target_id",
  "reporter_id",
  "reason",
  "note",
  "status",
  "resolved_by",
  "resolved_at",
  "created_at",
] as const;
const CONTACT_COLUMNS = [
  "id",
  "category",
  "message",
  "email",
  "user_id",
  "status",
  "resolved_by",
  "resolved_at",
  "created_at",
] as const;
const BLOG_POST_COLUMNS = [
  "id",
  "title",
  "content",
  "excerpt",
  "slug",
  "published",
  "published_at",
  "created_at",
  "updated_at",
] as const;

function required(row: NeonRow, field: string) {
  const value = row[field];
  if (value === null || value === undefined) {
    throw new Error(`Expected ${field} to be present`);
  }
  return value;
}

function stringValue(value: unknown) {
  if (typeof value !== "string") {
    throw new Error(`Expected string, received ${typeof value}`);
  }
  return value;
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : stringValue(value);
}

function integerValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error(`Expected safe integer, received ${String(value)}`);
  }
  return number;
}

function nullableInteger(value: unknown) {
  return value === null || value === undefined ? null : integerValue(value);
}

function booleanInteger(value: unknown) {
  if (value === true || value === 1 || value === "true") return 1;
  if (value === false || value === 0 || value === "false") return 0;
  throw new Error(`Expected boolean, received ${String(value)}`);
}

function timestampMilliseconds(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") {
    throw new Error(`Expected timestamp, received ${typeof value}`);
  }

  const hasTimezone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value);
  const normalized = hasTimezone ? value : `${value.replace(" ", "T")}Z`;
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return milliseconds;
}

function nullableTimestamp(value: unknown) {
  return value === null || value === undefined
    ? null
    : timestampMilliseconds(value);
}

function jsonText(value: unknown, fallback: unknown = null) {
  const resolved = value === null || value === undefined ? fallback : value;
  if (resolved === null) return null;
  if (typeof resolved === "string") {
    return JSON.stringify(JSON.parse(resolved));
  }
  return JSON.stringify(resolved);
}

function scoreTenths(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^\d{1,2}(?:\.\d)?$/.test(normalized)) {
    throw new Error(`Invalid review score: ${normalized}`);
  }
  const [whole, fraction = "0"] = normalized.split(".");
  return Number(whole) * 10 + Number(fraction);
}

interface MediaReference {
  id: string;
  objectKey: string;
  publicId: string;
  version: number;
  format: string;
}

function mediaReference(value: unknown, versionValue: unknown): MediaReference | null {
  const raw = nullableString(value);
  if (!raw) return null;

  let publicId = raw;
  let version = nullableInteger(versionValue) ?? 1;
  if (raw.startsWith("http")) {
    const url = new URL(raw);
    const uploadIndex = url.pathname.indexOf("/upload/");
    const path = uploadIndex >= 0 ? url.pathname.slice(uploadIndex + 8) : url.pathname;
    const segments = path.split("/").filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex >= 0) {
      version = Number(segments[versionIndex].slice(1));
      publicId = segments.slice(versionIndex + 1).join("/");
    } else {
      publicId = segments.at(-1) ?? raw;
    }
  }

  const extension = publicId.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const format = extension === "jpeg" ? "jpg" : extension ?? "jpg";
  if (extension) publicId = publicId.slice(0, -(extension.length + 1));
  const identity = `${publicId}:${version}:${format}`;
  const id = `media-${checksum(identity).slice(0, 32)}`;
  return {
    id,
    objectKey: `media/${publicId}/v${version}.${format}`,
    publicId,
    version,
    format,
  };
}

function mediaRow(reference: MediaReference, owner: string) {
  return {
    id: reference.id,
    object_key: reference.objectKey,
    public_id: reference.publicId,
    version: reference.version,
    mime_type: `image/${reference.format === "jpg" ? "jpeg" : reference.format}`,
    width: null,
    height: null,
    byte_size: null,
    checksum: null,
    status: "staged",
    original_provider: "cloudinary",
    original_metadata: JSON.stringify({ owner }),
    created_at: 0,
    updated_at: 0,
  };
}

function buildMediaPlan(contentRows: NeonRow[], reviewRows: NeonRow[]) {
  const assets = new Map<string, { reference: MediaReference; owner: string }>();
  const contentIds = new Map<string, string | null>();
  const reviewIds = new Map<string, string | null>();

  for (const row of contentRows) {
    const id = stringValue(required(row, "id"));
    const reference = mediaReference(row.poster_image, row.poster_version);
    contentIds.set(id, reference?.id ?? null);
    if (reference) assets.set(`${reference.publicId}:${reference.version}:${reference.format}`, { reference, owner: `content:${id}` });
  }
  for (const row of reviewRows) {
    const id = stringValue(required(row, "id"));
    const reference = mediaReference(row.review_image, null);
    reviewIds.set(id, reference?.id ?? null);
    if (reference) assets.set(`${reference.publicId}:${reference.version}:${reference.format}`, { reference, owner: `review:${id}` });
  }

  return {
    contentIds,
    reviewIds,
    rows: [...assets.values()].map(({ reference, owner }) => mediaRow(reference, owner)),
  };
}

export function mapUserRow(
  row: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    username: string | null;
    role: "user" | "admin";
    regular: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    email_verified: row.emailVerified ? 1 : 0,
    image: row.image,
    username: row.username,
    role: row.role,
    regular: row.regular ? 1 : 0,
    created_at: row.createdAt.getTime(),
    updated_at: row.updatedAt.getTime(),
  };
}

export function mapContentRow(row: NeonRow, posterMediaId: string | null = null): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    title: stringValue(required(row, "title")),
    content_type: stringValue(required(row, "content_type")),
    runtime: nullableInteger(row.runtime),
    release_date: nullableTimestamp(row.release_date),
    rating: nullableString(row.rating),
    synopsis: nullableString(row.synopsis),
    genre: jsonText(row.genre, []),
    poster_media_id: posterMediaId,
    poster_image: nullableString(row.poster_image),
    poster_version: nullableInteger(row.poster_version),
    trailer_url: nullableString(row.trailer_url),
    streaming_url: nullableString(row.streaming_url),
    streaming_platform: nullableString(row.streaming_platform),
    other_platform: nullableString(row.other_platform),
    viewing_category: nullableString(row.viewing_category),
    cast_members: jsonText(row.cast_members),
    is_movie_of_the_week: booleanInteger(row.is_movie_of_the_week),
    catalog_number: nullableInteger(row.catalog_number),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

export function mapDiscussionRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    title: stringValue(required(row, "title")),
    description: nullableString(row.description),
    content_id: nullableString(row.content_id),
    space_url: nullableString(row.space_url),
    podcast_links: jsonText(row.podcast_links, []),
    episode_number: nullableInteger(row.episode_number),
    discussion_date: nullableTimestamp(row.discussion_date),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

export function mapRatingRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    content_id: stringValue(required(row, "content_id")),
    user_id: stringValue(required(row, "user_id")),
    rating: integerValue(required(row, "rating")),
    review: nullableString(row.review),
    edited: booleanInteger(row.edited),
    flagged: booleanInteger(row.flagged),
    restricted: booleanInteger(row.restricted),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

export function mapReviewRow(row: NeonRow, reviewMediaId: string | null = null): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    content_id: stringValue(required(row, "content_id")),
    title: stringValue(required(row, "title")),
    description: stringValue(required(row, "description")),
    score_tenths: scoreTenths(row.score),
    reviewer: stringValue(required(row, "reviewer")),
    external_url: nullableString(row.external_url),
    review_media_id: reviewMediaId,
    review_image: nullableString(row.review_image),
    published_at: nullableTimestamp(row.published_at),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

export function mapCommentRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    review_id: stringValue(required(row, "review_id")),
    parent_id: nullableString(row.parent_id),
    user_id: stringValue(required(row, "user_id")),
    body: stringValue(required(row, "body")),
    depth: integerValue(required(row, "depth")),
    flagged: booleanInteger(row.flagged),
    restricted: booleanInteger(row.restricted),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

export function mapReportRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    target_type: stringValue(required(row, "target_type")),
    target_id: stringValue(required(row, "target_id")),
    reporter_id: stringValue(required(row, "reporter_id")),
    reason: stringValue(required(row, "reason")),
    note: nullableString(row.note),
    status: stringValue(required(row, "status")),
    resolved_by: nullableString(row.resolved_by),
    resolved_at: nullableTimestamp(row.resolved_at),
    created_at: timestampMilliseconds(required(row, "created_at")),
  };
}

export function mapContactRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    category: stringValue(required(row, "category")),
    message: stringValue(required(row, "message")),
    email: nullableString(row.email),
    user_id: nullableString(row.user_id),
    status: stringValue(required(row, "status")),
    resolved_by: nullableString(row.resolved_by),
    resolved_at: nullableTimestamp(row.resolved_at),
    created_at: timestampMilliseconds(required(row, "created_at")),
  };
}

export function mapBlogPostRow(row: NeonRow): Record<string, unknown> {
  return {
    id: stringValue(required(row, "id")),
    title: stringValue(required(row, "title")),
    content: stringValue(required(row, "content")),
    excerpt: nullableString(row.excerpt),
    slug: stringValue(required(row, "slug")),
    published: booleanInteger(row.published),
    published_at: nullableTimestamp(row.published_at),
    created_at: timestampMilliseconds(required(row, "created_at")),
    updated_at: timestampMilliseconds(required(row, "updated_at")),
  };
}

// Reconciles every Neon table and the Hexclave users into canonical SQLite
// rows. User rows reuse planHexclaveImport; the Neon user mirror's username is
// authoritative for each identity, so it is merged over the Hexclave metadata
// before planning.
export function planSqliteImport(input: SqliteImportInput): SqliteImportPlan {
  const mirrorUsernameByUserId = new Map(
    input.userMirrors.map((user) => [user.id, user.username]),
  );
  const mergedUsers = input.hexclaveUsers.map((user) => {
    const metadata =
      user.clientMetadata && typeof user.clientMetadata === "object"
        ? user.clientMetadata
        : {};
    const mirrorUsername = mirrorUsernameByUserId.get(user.id);
    const metadataUsername =
      typeof metadata.username === "string" && metadata.username.trim()
        ? metadata.username
        : null;
    return {
      ...user,
      clientMetadata: {
        ...metadata,
        username: mirrorUsername ?? metadataUsername,
      },
    };
  });

  const userPlan = planHexclaveImport(mergedUsers, input.userMirrors);
  const mediaPlan = buildMediaPlan(input.content, input.reviews);

  const definitions: TableDefinition[] = [
    { table: "users", columns: [...USER_COLUMNS], rows: userPlan.rows.map(mapUserRow) },
    {
      table: "media",
      columns: [...MEDIA_COLUMNS],
      rows: mediaPlan.rows,
    },
    {
      table: "content",
      columns: [...CONTENT_COLUMNS],
      rows: input.content.map((row) =>
        mapContentRow(
          row,
          mediaPlan.contentIds.get(stringValue(required(row, "id"))) ?? null,
        ),
      ),
    },
    {
      table: "discussions",
      columns: [...DISCUSSION_COLUMNS],
      rows: input.discussions.map(mapDiscussionRow),
    },
    {
      table: "user_ratings",
      columns: [...RATING_COLUMNS],
      rows: input.ratings.map(mapRatingRow),
    },
    {
      table: "reviews",
      columns: [...REVIEW_COLUMNS],
      rows: input.reviews.map((row) =>
        mapReviewRow(
          row,
          mediaPlan.reviewIds.get(stringValue(required(row, "id"))) ?? null,
        ),
      ),
    },
    {
      table: "comments",
      columns: [...COMMENT_COLUMNS],
      rows: input.comments.map(mapCommentRow),
    },
    {
      table: "reports",
      columns: [...REPORT_COLUMNS],
      rows: input.reports.map(mapReportRow),
    },
    {
      table: "contact_messages",
      columns: [...CONTACT_COLUMNS],
      rows: input.contacts.map(mapContactRow),
    },
    {
      table: "blog_posts",
      columns: [...BLOG_POST_COLUMNS],
      rows: input.blogPosts.map(mapBlogPostRow),
    },
  ];

  const rowCounts = Object.fromEntries(
    definitions.map((definition) => [definition.table, definition.rows.length]),
  );
  return {
    definitions,
    claims: userPlan.claims,
    usernameDropped: userPlan.usernameDropped,
    rowCounts,
  };
}

export function sqlValue(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot serialize non-finite number");
    }
    return String(value);
  }
  if (typeof value === "string") {
    return `'${value.replaceAll("'", "''")}'`;
  }
  throw new Error(`Unsupported SQL value type: ${typeof value}`);
}

export function insertStatements(
  table: string,
  columns: readonly string[],
  rows: Record<string, unknown>[],
) {
  const statements: string[] = [];
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values = batch
      .map(
        (row) =>
          `(${columns.map((column) => sqlValue(row[column] ?? null)).join(", ")})`,
      )
      .join(",\n");
    statements.push(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES\n${values};`,
    );
  }
  return statements;
}

const DELETE_ORDER = [
  "comments",
  "reports",
  "reviews",
  "user_ratings",
  "discussions",
  "content",
  "contact_messages",
  "blog_posts",
  "media",
  "verifications",
  "accounts",
  "sessions",
  "users",
];

export function renderImportSql(definitions: TableDefinition[]): string {
  const statements = [
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE;",
    ...DELETE_ORDER.map((table) => `DELETE FROM "${table}";`),
    ...definitions.flatMap((definition) =>
      insertStatements(definition.table, definition.columns, definition.rows),
    ),
    `UPDATE content
     SET catalog_number = (
       SELECT MIN(episode_number)
       FROM discussions
       WHERE discussions.content_id = content.id
     );`,
    "COMMIT;",
  ];
  return `${statements.join("\n\n")}\n`;
}

export interface ImportManifest {
  generatedAt: string;
  sqlChecksum: string;
  rowCounts: Record<string, number>;
  usernameDropped: string[];
  sourceRowCount: number;
}

export function buildImportManifest(
  sql: string,
  plan: SqliteImportPlan,
  generatedAt = new Date(),
): ImportManifest {
  return {
    generatedAt: generatedAt.toISOString(),
    sqlChecksum: checksum(sql),
    rowCounts: plan.rowCounts,
    usernameDropped: plan.usernameDropped,
    sourceRowCount: Object.values(plan.rowCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}

async function readNeonTable(directory: string, table: string) {
  return JSON.parse(
    await readFile(resolve(directory, `${table}.json`), "utf8"),
  ) as NeonRow[];
}

async function main() {
  const neonDirectory = resolve("data/migration/neon");
  const outputSqlPath = resolve("data/migration/sqlite-import.sql");
  const outputManifestPath = resolve(
    "data/migration/sqlite-import-manifest.json",
  );
  const claimsPath = resolve("data/migration/account-claims.json");

  const [
    userMirrors,
    sourceContent,
    sourceDiscussions,
    sourceRatings,
    sourceReviews,
    sourceComments,
    sourceReports,
    sourceContacts,
    sourceBlogPosts,
    hexclaveUsers,
  ] = await Promise.all([
    readNeonTable(neonDirectory, "users"),
    readNeonTable(neonDirectory, "content"),
    readNeonTable(neonDirectory, "discussions"),
    readNeonTable(neonDirectory, "user_ratings"),
    readNeonTable(neonDirectory, "reviews"),
    readNeonTable(neonDirectory, "comments"),
    readNeonTable(neonDirectory, "reports"),
    readNeonTable(neonDirectory, "contact_messages"),
    readNeonTable(neonDirectory, "blog_posts"),
    readHexclaveExport(resolve("data/migration/hexclave/users.json")),
  ]);

  const plan = planSqliteImport({
    userMirrors,
    hexclaveUsers,
    content: sourceContent,
    discussions: sourceDiscussions,
    ratings: sourceRatings,
    reviews: sourceReviews,
    comments: sourceComments,
    reports: sourceReports,
    contacts: sourceContacts,
    blogPosts: sourceBlogPosts,
  });
  const sql = renderImportSql(plan.definitions);

  await Promise.all([
    writeTextAtomic(outputSqlPath, sql),
    writeJsonAtomic(outputManifestPath, buildImportManifest(sql, plan)),
    writeJsonAtomic(claimsPath, {
      generatedAt: new Date().toISOString(),
      reason:
        "Hexclave does not expose password hashes or OAuth provider account IDs through the server SDK.",
      users: plan.claims,
    }),
  ]);

  console.log(
    JSON.stringify({
      message: "SQLite import transformation complete",
      rowCounts: plan.rowCounts,
      usernameCollisionsDropped: plan.usernameDropped.length,
      outputSqlPath,
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checksum, writeJsonAtomic, writeTextAtomic } from "./io";

type SourceRow = Record<string, unknown>;
type HexclaveUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  profileImageUrl: string | null;
  signedUpAt: string;
  clientMetadata: unknown;
  clientReadOnlyMetadata: unknown;
  hasPassword: boolean;
  isAnonymous: boolean;
  oauthProviders: string[];
};
type HexclaveExport = {
  users: HexclaveUser[];
};

const neonDirectory = resolve("data/migration/neon");
const outputSqlPath = resolve("data/migration/sqlite-import.sql");
const outputManifestPath = resolve("data/migration/sqlite-import-manifest.json");
const claimsPath = resolve("data/migration/account-claims.json");

async function readJson<T>(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readNeonTable(table: string) {
  return readJson<SourceRow[]>(resolve(neonDirectory, `${table}.json`));
}

function required(row: SourceRow, field: string) {
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

function sqlValue(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot serialize non-finite number");
    return String(value);
  }
  if (typeof value === "string") {
    return `'${value.replaceAll("'", "''")}'`;
  }
  throw new Error(`Unsupported SQL value type: ${typeof value}`);
}

function insertStatements(
  table: string,
  columns: string[],
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
  hexclave,
] = await Promise.all([
  readNeonTable("users"),
  readNeonTable("content"),
  readNeonTable("discussions"),
  readNeonTable("user_ratings"),
  readNeonTable("reviews"),
  readNeonTable("comments"),
  readNeonTable("reports"),
  readNeonTable("contact_messages"),
  readNeonTable("blog_posts"),
  readJson<HexclaveExport>(resolve("data/migration/hexclave/users.json")),
]);

const usernameByUserId = new Map(
  userMirrors.map((user) => [
    stringValue(required(user, "id")),
    nullableString(user.username),
  ]),
);
const emailOwners = new Map<string, string>();
const usernameOwners = new Map<string, string>();
const claims: Record<string, unknown>[] = [];

const users = hexclave.users.map((user) => {
  const metadata =
    user.clientMetadata && typeof user.clientMetadata === "object"
      ? (user.clientMetadata as Record<string, unknown>)
      : {};
  const readOnlyMetadata =
    user.clientReadOnlyMetadata &&
    typeof user.clientReadOnlyMetadata === "object"
      ? (user.clientReadOnlyMetadata as Record<string, unknown>)
      : {};
  const email =
    user.primaryEmail?.trim().toLowerCase() ?? `legacy-${user.id}@nfc.invalid`;
  const username =
    usernameByUserId.get(user.id) ?? nullableString(metadata.username);
  const existingEmailOwner = emailOwners.get(email);
  if (existingEmailOwner && existingEmailOwner !== user.id) {
    throw new Error("Hexclave contains a case-insensitive email collision");
  }
  emailOwners.set(email, user.id);

  if (username) {
    const normalizedUsername = username.toLowerCase();
    const existingUsernameOwner = usernameOwners.get(normalizedUsername);
    if (existingUsernameOwner && existingUsernameOwner !== user.id) {
      throw new Error("Hexclave contains a case-insensitive username collision");
    }
    usernameOwners.set(normalizedUsername, user.id);
  }

  claims.push({
    userId: user.id,
    hasPassword: user.hasPassword,
    providers: user.oauthProviders,
    requiresPasswordReset: user.hasPassword,
    requiresProviderClaim: user.oauthProviders.length > 0,
    requiresEmailClaim: user.primaryEmail === null,
  });

  return {
    id: user.id,
    name:
      user.displayName?.trim() ||
      user.primaryEmail?.split("@")[0] ||
      "NFC Member",
    email,
    email_verified: user.primaryEmail ? booleanInteger(user.primaryEmailVerified) : 0,
    image: user.profileImageUrl,
    username,
    role: readOnlyMetadata.role === "admin" ? "admin" : "user",
    regular: readOnlyMetadata.regular === true ? 1 : 0,
    created_at: timestampMilliseconds(user.signedUpAt),
    updated_at: timestampMilliseconds(user.signedUpAt),
  };
});

const content = sourceContent.map((row) => ({
  id: stringValue(required(row, "id")),
  title: stringValue(required(row, "title")),
  content_type: stringValue(required(row, "content_type")),
  runtime: nullableInteger(row.runtime),
  release_date: nullableTimestamp(row.release_date),
  rating: nullableString(row.rating),
  synopsis: nullableString(row.synopsis),
  genre: jsonText(row.genre, []),
  poster_media_id: null,
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
}));

const discussions = sourceDiscussions.map((row) => ({
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
}));

const ratings = sourceRatings.map((row) => ({
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
}));

const reviews = sourceReviews.map((row) => ({
  id: stringValue(required(row, "id")),
  content_id: stringValue(required(row, "content_id")),
  title: stringValue(required(row, "title")),
  description: stringValue(required(row, "description")),
  score_tenths: scoreTenths(row.score),
  reviewer: stringValue(required(row, "reviewer")),
  external_url: nullableString(row.external_url),
  review_media_id: null,
  review_image: nullableString(row.review_image),
  published_at: nullableTimestamp(row.published_at),
  created_at: timestampMilliseconds(required(row, "created_at")),
  updated_at: timestampMilliseconds(required(row, "updated_at")),
}));

const comments = sourceComments.map((row) => ({
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
}));

const reports = sourceReports.map((row) => ({
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
}));

const contacts = sourceContacts.map((row) => ({
  id: stringValue(required(row, "id")),
  category: stringValue(required(row, "category")),
  message: stringValue(required(row, "message")),
  email: nullableString(row.email),
  user_id: nullableString(row.user_id),
  status: stringValue(required(row, "status")),
  resolved_by: nullableString(row.resolved_by),
  resolved_at: nullableTimestamp(row.resolved_at),
  created_at: timestampMilliseconds(required(row, "created_at")),
}));

const blogPosts = sourceBlogPosts.map((row) => ({
  id: stringValue(required(row, "id")),
  title: stringValue(required(row, "title")),
  content: stringValue(required(row, "content")),
  excerpt: nullableString(row.excerpt),
  slug: stringValue(required(row, "slug")),
  published: booleanInteger(row.published),
  published_at: nullableTimestamp(row.published_at),
  created_at: timestampMilliseconds(required(row, "created_at")),
  updated_at: timestampMilliseconds(required(row, "updated_at")),
}));

const definitions = [
  {
    table: "users",
    columns: [
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
    ],
    rows: users,
  },
  {
    table: "content",
    columns: [
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
    ],
    rows: content,
  },
  {
    table: "discussions",
    columns: [
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
    ],
    rows: discussions,
  },
  {
    table: "user_ratings",
    columns: [
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
    ],
    rows: ratings,
  },
  {
    table: "reviews",
    columns: [
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
    ],
    rows: reviews,
  },
  {
    table: "comments",
    columns: [
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
    ],
    rows: comments,
  },
  {
    table: "reports",
    columns: [
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
    ],
    rows: reports,
  },
  {
    table: "contact_messages",
    columns: [
      "id",
      "category",
      "message",
      "email",
      "user_id",
      "status",
      "resolved_by",
      "resolved_at",
      "created_at",
    ],
    rows: contacts,
  },
  {
    table: "blog_posts",
    columns: [
      "id",
      "title",
      "content",
      "excerpt",
      "slug",
      "published",
      "published_at",
      "created_at",
      "updated_at",
    ],
    rows: blogPosts,
  },
] satisfies Array<{
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}>;

const deleteOrder = [
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
const statements = [
  "PRAGMA foreign_keys = ON;",
  "BEGIN IMMEDIATE;",
  ...deleteOrder.map((table) => `DELETE FROM "${table}";`),
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
const sqlOutput = `${statements.join("\n\n")}\n`;
const rowCounts = Object.fromEntries(
  definitions.map((definition) => [definition.table, definition.rows.length]),
);

await Promise.all([
  writeTextAtomic(outputSqlPath, sqlOutput),
  writeJsonAtomic(outputManifestPath, {
    generatedAt: new Date().toISOString(),
    sqlChecksum: checksum(sqlOutput),
    rowCounts,
    sourceRowCount: Object.values(rowCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  }),
  writeJsonAtomic(claimsPath, {
    generatedAt: new Date().toISOString(),
    reason:
      "Hexclave does not expose password hashes or OAuth provider account IDs through the server SDK.",
    users: claims,
  }),
]);

console.log(
  JSON.stringify({
    message: "SQLite import transformation complete",
    rowCounts,
    outputSqlPath,
  }),
);

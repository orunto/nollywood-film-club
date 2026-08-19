import { resolve } from "node:path";
import { StackServerApp } from "@stackframe/stack";
import { requireEnvironment } from "./environment";
import { checksum, writeJsonAtomic } from "./io";

const outputPath = resolve("data/migration/hexclave/users.json");
const app = new StackServerApp({
  projectId: requireEnvironment("NEXT_PUBLIC_STACK_PROJECT_ID"),
  publishableClientKey: requireEnvironment(
    "NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY",
  ),
  secretServerKey: requireEnvironment("STACK_SECRET_SERVER_KEY"),
  tokenStore: "memory",
  noAutomaticPrefetch: true,
});
const users: Record<string, unknown>[] = [];
const seenCursors = new Set<string>();
let cursor: string | undefined;

async function listUsersPage(pageCursor: string | undefined) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await app.listUsers({
        cursor: pageCursor,
        limit: 100,
        orderBy: "signedUpAt",
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, attempt * 2_000),
      );
    }
  }
  throw new Error("Hexclave retry loop exited unexpectedly");
}

do {
  const page = await listUsersPage(cursor);

  users.push(
    ...page.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      primaryEmail: user.primaryEmail,
      primaryEmailVerified: user.primaryEmailVerified,
      profileImageUrl: user.profileImageUrl,
      signedUpAt: user.signedUpAt.toISOString(),
      lastActiveAt: user.lastActiveAt.toISOString(),
      clientMetadata: user.clientMetadata,
      clientReadOnlyMetadata: user.clientReadOnlyMetadata,
      serverMetadata: user.serverMetadata,
      hasPassword: user.hasPassword,
      isAnonymous: user.isAnonymous,
      oauthProviders: user.oauthProviders.map((provider) => provider.id),
    })),
  );

  if (!page.nextCursor) {
    cursor = undefined;
  } else {
    if (seenCursors.has(page.nextCursor)) {
      throw new Error("Hexclave pagination returned a repeated cursor");
    }
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
} while (cursor);

const serializedUsers = `${JSON.stringify(users, null, 2)}\n`;
await writeJsonAtomic(outputPath, {
  generatedAt: new Date().toISOString(),
  count: users.length,
  checksum: checksum(serializedUsers),
  users,
});

console.log(
  JSON.stringify({
    message: "Hexclave user export complete",
    userCount: users.length,
  }),
);

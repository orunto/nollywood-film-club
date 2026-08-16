import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { betterAuth } from "better-auth/minimal";
import * as schema from "../db/schema";
import type { AuthService } from "../services/contracts";

export interface BetterAuthProviderConfig {
  clientId: string;
  clientSecret: string;
}

export interface BetterAuthServiceOptions {
  baseURL: string;
  secret: string;
  google?: BetterAuthProviderConfig;
  twitter?: BetterAuthProviderConfig;
}

// Both runtimes build the same Better Auth configuration over their own
// Drizzle instance, so authentication is portable across D1 and Node SQLite.
type DrizzleInstance =
  | DrizzleD1Database<typeof schema>
  | SqliteRemoteDatabase<typeof schema>;

export function createBetterAuthService(
  db: DrizzleInstance,
  options: BetterAuthServiceOptions,
): AuthService {
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
    }),
    baseURL: options.baseURL,
    secret: options.secret,
    appName: "Nollywood Film Club",
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: options.google
        ? {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
          }
        : undefined,
      twitter: options.twitter
        ? {
            clientId: options.twitter.clientId,
            clientSecret: options.twitter.clientSecret,
          }
        : undefined,
    },
    user: {
      additionalFields: {
        // Server-owned columns, never client-writable. Role authorization
        // stays in the database, matching the legacy security boundary.
        username: { type: "string", input: false },
        role: { type: "string", input: false },
        regular: { type: "boolean", input: false },
      },
    },
    advanced: {
      cookiePrefix: "nollywood",
    },
  });

  return {
    async handler(request) {
      return auth.handler(request);
    },
    async getSession(request) {
      const result = await auth.api.getSession({ headers: request.headers });
      return result?.user ? { userId: result.user.id } : null;
    },
  };
}
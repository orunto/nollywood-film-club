import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { betterAuth } from "better-auth/minimal";
import * as schema from "../db/schema";
import type { AuthService, MailService } from "../services/contracts";

export interface BetterAuthProviderConfig {
  clientId: string;
  clientSecret: string;
}

export interface BetterAuthServiceOptions {
  baseURL: string;
  secret: string;
  mail: MailService;
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
      // A reset link is the only email the app currently sends, so it goes
      // through the same portable MailService seam as everything else. The
      // provider behind it (transactional email) is selected in a later phase.
      sendResetPassword: async ({ user, url }) => {
        await options.mail.send({
          to: user.email,
          subject: "Reset your Nollywood Film Club password",
          text: [
            "You asked to reset your Nollywood Film Club password.",
            "",
            url,
            "",
            "If you did not ask for this, you can safely ignore this email.",
          ].join("\n"),
        });
      },
      // A stolen session should not survive a password reset: the legitimate
      // owner signs back in from the reset page.
      revokeSessionsOnPasswordReset: true,
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
    account: {
      accountLinking: {
        // Pre-migrated users keep their Hexclave user IDs, so an OAuth
        // sign-in for an existing email must attach the provider account to
        // that row rather than minting a duplicate user.
        enabled: true,
        // Only link a provider identity into a local row whose email is
        // verified, and never from a provider's unverified email claim on its
        // own. Anything ambiguous must go through an authenticated claim
        // flow, per the migration plan.
        requireLocalEmailVerified: true,
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
      if (!result?.user) {
        return null;
      }
      return {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username ?? null,
        role: result.user.role === "admin" ? "admin" : "user",
        regular: Boolean(result.user.regular),
      };
    },
  };
}
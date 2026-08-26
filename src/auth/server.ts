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

function authEmail(options: {
  title: string;
  message: string;
  action: string;
  url: string;
  footer: string;
}) {
  const safeUrl = options.url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return {
    text: [
      options.message,
      "",
      options.url,
      "",
      options.footer,
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5f2;color:#171717;font-family:Arial,sans-serif;">
    <main style="max-width:560px;margin:32px auto;padding:40px;background:#ffffff;border:1px solid #e4e1dc;">
      <p style="margin:0 0 28px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Nollywood Film Club</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;">${options.title}</h1>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.55;">${options.message}</p>
      <p style="margin:0 0 28px;"><a href="${safeUrl}" style="display:inline-block;padding:13px 20px;background:#d1416d;color:#ffffff;font-weight:700;text-decoration:none;">${options.action}</a></p>
      <p style="margin:0;color:#5c5c5c;font-size:13px;line-height:1.5;">${options.footer}</p>
    </main>
  </body>
</html>`,
  };
}

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
      // New credential users receive a session immediately so the client can
      // complete onboarding; verification still runs asynchronously by email.
      requireEmailVerification: false,
      autoSignIn: true,
      // Reset and verification links use the same portable MailService seam.
      sendResetPassword: async ({ user, url }) => {
        await options.mail.send({
          to: user.email,
          subject: "Reset your Nollywood Film Club password",
          ...authEmail({
            title: "Reset your password",
            message: "You asked to reset your Nollywood Film Club password.",
            action: "Reset password",
            url,
            footer: "If you did not ask for this, you can safely ignore this email.",
          }),
        });
      },
      // A stolen session should not survive a password reset: the legitimate
      // owner signs back in from the reset page.
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await options.mail.send({
          to: user.email,
          subject: "Verify your Nollywood Film Club email",
          ...authEmail({
            title: "Verify your email",
            message: "Confirm your email address to finish setting up your Nollywood Film Club account.",
            action: "Verify email",
            url,
            footer: "If you did not create this account, you can safely ignore this email.",
          }),
        });
      },
    },
    socialProviders: {
      google: options.google
        ? {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
            prompt: "consent",
          }
        : undefined,
      twitter: options.twitter
        ? {
            clientId: options.twitter.clientId,
            clientSecret: options.twitter.clientSecret,
            scope: ["user.email"],
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
        profileImageUrl: result.user.image ?? null,
        role: result.user.role === "admin" ? "admin" : "user",
        regular: Boolean(result.user.regular),
      };
    },
  };
}

import type { Route } from "./+types/api.account-claim";
import { appServicesContext } from "../context";

const providers = new Set(["google", "twitter"]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const body = await request.json().catch(() => null) as {
    action?: string;
    email?: string;
    providerId?: string;
    token?: string;
    accountId?: string;
  } | null;
  if (!body || !providers.has(body.providerId ?? "")) return json({ error: "Invalid claim request" }, 400);
  const providerId = body.providerId as "google" | "twitter";

  if (body.action === "request") {
    if (!body.email) return json({ error: "Invalid claim request" }, 400);
    const row = await services.db.publicReads.findUserByEmail?.(body.email.toLowerCase());
    // Always return the same response to avoid account enumeration.
    if (row?.id && row.emailVerified) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const token = btoa(String.fromCodePoint(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      await services.db.atomic([{
        sql: "INSERT INTO account_claims (id, user_id, provider_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        params: [crypto.randomUUID(), row.id, providerId, await hash(token), Date.now() + 30 * 60_000, Date.now()],
      }]);
      await services.mail.send({
        to: row.email,
        subject: "Claim your Nollywood Film Club account",
        text: `Use this one-time link to connect your ${body.providerId} account: ${new URL(`/account-claim?token=${encodeURIComponent(token)}`, request.url)}`,
      });
    }
    return json({ message: "If the account is eligible, a claim link has been sent." });
  }

  if (body.action !== "complete" || !body.token || !body.accountId) return json({ error: "Invalid claim request" }, 400);
  const now = Date.now();
  const claim = await services.db.publicReads.findAccountClaim(await hash(body.token));
  if (!claim || claim.providerId !== providerId || claim.consumedAt || claim.expiresAt.getTime() <= now) return json({ error: "Claim is invalid or expired" }, 400);
  await services.db.atomic([
    { sql: "INSERT INTO accounts (id, account_id, provider_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", params: [crypto.randomUUID(), body.accountId, providerId, claim.userId, now, now] },
    { sql: "UPDATE account_claims SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL", params: [now, claim.id] },
  ]);
  return json({ claimed: true });
}

export async function loader() {
  return json({ error: "Use POST" }, 405);
}

// Single source of truth for how an admin is identified.
//
// Role lives in `clientReadOnlyMetadata`, NOT `clientMetadata`. The distinction
// is the whole security boundary: `clientMetadata` is writable by the signed-in
// user from the browser (`user.update({ clientMetadata })`), so a role kept
// there could be self-granted by anyone. `clientReadOnlyMetadata` is readable by
// the client but writable only by the server (`setClientReadOnlyMetadata`), so
// the client can be shown "you're an admin" without being able to forge it.
//
// Even so, a client-side role read is only ever a UI hint. The real gate is the
// server check in authenticateAdmin(); never trust this in the browser to
// protect anything.

type WithRole = {
  clientReadOnlyMetadata?: { role?: string } | null;
};

export function isAdminUser(user: WithRole | null | undefined): boolean {
  return user?.clientReadOnlyMetadata?.role === "admin";
}

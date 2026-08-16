import { createAuthClient } from "better-auth/client";

// The client resolves the auth API relative to the current page origin, which
// matches whichever runtime is serving it (Cloudflare dev on 8787, Node on
// 3000). baseURL is set explicitly so the server build does not assume a
// window exists.
export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined" ? undefined : window.location.origin,
});
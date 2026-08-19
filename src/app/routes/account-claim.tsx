import { useState } from "react";
import { useSearchParams } from "react-router";

export default function AccountClaimPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [providerId, setProviderId] = useState<"google" | "twitter">("google");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/account-claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", token, providerId, accountId }),
    });
    setStatus(response.ok ? "Provider linked. You can now sign in with it." : "This claim is invalid or expired.");
  }

  return <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-20">
    <form onSubmit={submit} className="w-full space-y-4 rounded-sm border border-black/10 bg-white p-6">
      <h1 className="text-2xl font-bold">Claim your account</h1>
      <p className="text-sm text-gray-600">This one-time link connects a legacy account to a provider identity. Use the provider account ID supplied by support.</p>
      <select value={providerId} onChange={(event) => setProviderId(event.target.value as "google" | "twitter")} className="w-full border p-2"><option value="google">Google</option><option value="twitter">X</option></select>
      <input required value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="Provider account ID" className="w-full border p-2" />
      <button disabled={!token} className="w-full bg-black px-4 py-2 text-white">Link provider</button>
      {status && <p className="text-sm">{status}</p>}
    </form>
  </main>;
}

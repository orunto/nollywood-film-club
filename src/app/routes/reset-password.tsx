import { useState } from "react";
import { Link, useParams } from "react-router";
import type { Route } from "./+types/reset-password";
import { authClient } from "../../auth/client";

export const meta: Route.MetaFunction = () => [
  { title: "Reset password · Nollywood Film Club" },
];

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    setError(null);
    const { error: resetError } = await authClient.resetPassword({
      token,
      newPassword: password,
    });
    if (resetError) {
      setError(
        "This reset link is invalid or has expired. Request a new one.",
      );
      return;
    }
    setReset(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-20">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm text-gray-500">
            Make it at least 8 characters and nothing you use elsewhere.
          </p>
        </div>

        {reset ? (
          <div className="space-y-4 rounded-sm border border-black/10 bg-white p-6">
            <p className="text-sm text-gray-600">
              Your password has been reset and your other sessions signed out.
            </p>
            <Link
              to="/auth"
              className="inline-block rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-sm border border-black/10 bg-white p-6"
          >
            {error && (
              <p className="rounded-sm border border-red-700/30 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <label className="block space-y-1">
              <span className="text-sm font-semibold">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-sm border border-black/40 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-sm border border-black/40 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/20"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
            >
              Reset password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
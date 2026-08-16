import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/forgot-password";
import { authClient } from "../../auth/client";

export const meta: Route.MetaFunction = () => [
  { title: "Forgot password · Nollywood Film Club" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
    });
    if (resetError) {
      setError("Could not request a reset link. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-20">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="text-sm text-gray-500">
            Enter the email on your account and we will send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 rounded-sm border border-black/10 bg-white p-6">
            <p className="text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, a password
              reset link is on its way. Check your inbox.
            </p>
            <Link
              to="/auth"
              className="inline-block text-sm text-black underline underline-offset-2"
            >
              Back to sign in
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
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full rounded-sm border border-black/40 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/20"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
            >
              Send reset link
            </button>
            <p className="text-center text-sm">
              <Link
                to="/auth"
                className="text-black underline underline-offset-2"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
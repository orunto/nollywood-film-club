import { useState } from "react";
import { redirect, useNavigate, Link } from "react-router";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { Route } from "./+types/auth";
import { appServicesContext } from "../context";
import { authClient } from "../../auth/client";
import { emailLocalPart } from "../../lib/username";

const inputClass =
  "w-full rounded-sm border border-black/40 px-3 py-2 text-sm shadow-none outline-none focus:border-[#d1416d] focus:ring-2 focus:ring-[#d1416d]/20";
const labelClass = "text-sm font-semibold";
const buttonClass =
  "w-full rounded-sm bg-[#d1416d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b7375d] disabled:cursor-not-allowed disabled:opacity-60";

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = await context.get(appServicesContext).auth.getSession(request);
  if (session) {
    // An OAuth callback lands back on the initiating page; bounce signed-in
    // visitors to the role-based redirect so they reach the right destination.
    throw redirect("/auth/callback");
  }
  return null;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "twitter" | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const goToCallback = () => navigate("/auth/callback");

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: emailLocalPart(email) || "NFC Member",
    });
    setLoading(false);
    if (signUpError) {
      setError("Failed to create account. Please try again.");
      return;
    }
    goToCallback();
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Invalid credentials. Please try again.");
      return;
    }
    goToCallback();
  };

  const handleSocial = async (provider: "google" | "twitter") => {
    if (socialLoading) return;

    setSocialLoading(provider);
    setError(null);
    try {
      const { error: socialError } = await authClient.signIn.social({
        provider,
        callbackURL: "/auth/callback",
      });
      if (socialError) {
        toast.error(
          `Couldn't connect to ${provider === "google" ? "Google" : "X"}. Please try again.`,
        );
        setSocialLoading(null);
      }
    } catch {
      toast.error(
        `Couldn't connect to ${provider === "google" ? "Google" : "X"}. Please try again.`,
      );
      setSocialLoading(null);
    }
  };

  return (
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
      <div className="w-full max-w-md lg:-translate-y-10">
        <div className="grid w-full grid-cols-2 rounded-t-sm border border-b-0 border-black/20">
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`cursor-pointer rounded-tl-sm px-4 py-2 text-sm font-semibold ${
              tab === "signup"
                ? "bg-[#d1416d] text-white"
                : "text-black/60 hover:text-black"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`cursor-pointer rounded-tr-sm px-4 py-2 text-sm font-semibold ${
              tab === "signin"
                ? "bg-[#d1416d] text-white"
                : "text-black/60 hover:text-black"
            }`}
          >
            Sign In
          </button>
        </div>

        <section className="space-y-4 rounded-b-sm border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-2xl font-bold">
              {tab === "signup" ? "Join the Club" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {tab === "signup"
                ? "Create a Nollywood Film Club account and start rating movies"
                : "Sign in to your Nollywood Film Club account"}
            </p>
          </div>

          {error && (
            <p className="rounded-sm border border-red-700/30 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form
            onSubmit={tab === "signup" ? handleSignUp : handleSignIn}
            className="space-y-4"
          >
            <label className="block space-y-1">
              <span className={labelClass}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  tab === "signup" ? "Create a password" : "Enter your password"
                }
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                required
                minLength={tab === "signup" ? 8 : undefined}
                className={inputClass}
              />
            </label>
            {tab === "signup" && (
              <label className="block space-y-1">
                <span className={labelClass}>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </label>
            )}
            <button
              type="submit"
              disabled={loading || socialLoading !== null}
              className={buttonClass}
            >
              {tab === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          {tab === "signin" && (
            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-black underline underline-offset-2 hover:text-black/70"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#d1416d]/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs uppercase text-[#b7375d]">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocial("google")}
              disabled={loading || socialLoading !== null}
              aria-busy={socialLoading === "google"}
              className="flex items-center justify-center rounded-sm border border-[#d1416d]/25 bg-white px-4 py-2 text-sm font-medium text-black transition-[transform,background-color,opacity,color] duration-150 hover:bg-[#fff0f4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
            >
              {socialLoading === "google" ? (
                <CircleNotchIcon
                  className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#3978e4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#248a42"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#e8af01"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ca3726"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {socialLoading === "google" ? "Connecting..." : "Google"}
            </button>
            <button
              type="button"
              onClick={() => handleSocial("twitter")}
              disabled={loading || socialLoading !== null}
              aria-busy={socialLoading === "twitter"}
              className="flex items-center justify-center rounded-sm border border-black/20 bg-white px-4 py-2 text-sm font-medium text-black transition-[transform,background-color,color,opacity] duration-150 hover:bg-black hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
            >
              {socialLoading === "twitter" ? (
                <CircleNotchIcon
                  className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <svg
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )}
              {socialLoading === "twitter" ? "Connecting..." : "X (Twitter)"}
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-gray-500 [&_a]:underline">
          By creating an account, you agree to our <Link to="/terms">Terms of Service</Link> and
          acknowledge our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}

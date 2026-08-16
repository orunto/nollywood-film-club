import { useEffect, useState } from "react";
import { redirect, useNavigate, useLoaderData } from "react-router";
import type { Route } from "./+types/onboarding";
import { appServicesContext } from "../context";
import {
  USERNAME_RE,
  emailLocalPart,
  usernameSuggestions,
} from "../../lib/username";

const fieldClass =
  "w-full rounded-sm border border-black/40 px-3 py-2 text-sm shadow-none outline-none focus:border-black focus:ring-2 focus:ring-black/20";

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = await context.get(appServicesContext).auth.getSession(request);
  if (!session) {
    throw redirect("/auth");
  }
  if (session.username && session.username.trim() !== "") {
    throw redirect("/");
  }
  return { user: { name: session.name, email: session.email } };
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

interface UsernameCheck {
  available: boolean;
  message: string;
}

export default function OnboardingPage() {
  const { user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(
    user.name?.trim() || emailLocalPart(user.email),
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedUsername = useDebounce(username, 500);

  // Suggestions come from what we already know about the user; availability
  // is answered by one batched request, mirroring the legacy onboarding.
  useEffect(() => {
    const candidates = usernameSuggestions([user.name, emailLocalPart(user.email)]);
    if (candidates.length === 0) return;
    void fetch("/api/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: candidates.slice(0, 6) }),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          results?: { username: string; available: boolean }[];
        };
        setSuggestions(
          (data.results ?? [])
            .filter((result) => result.available)
            .map((result) => result.username)
            .slice(0, 3),
        );
      })
      .catch(() => setSuggestions([]));
  }, [user.name, user.email]);

  useEffect(() => {
    if (!USERNAME_RE.test(debouncedUsername)) {
      setUsernameStatus(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: debouncedUsername }),
    })
      .then(async (response) => {
        const data = (await response.json()) as
          | { available?: boolean; message?: string; error?: string }
          | undefined;
        if (cancelled) return;
        setUsernameStatus(
          response.ok
            ? {
                available: Boolean(data?.available),
                message: data?.message ?? "",
              }
            : { available: false, message: data?.error ?? "Could not check that one" },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setUsernameStatus({ available: false, message: "Could not check that one" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername]);

  const showFormatHint = username.length > 0 && !USERNAME_RE.test(username);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usernameStatus?.available) {
      setError("Pick a username that is still going spare.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/create-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string } | undefined;
        setError(data?.error ?? "Could not save that. Try again.");
        return;
      }
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Could not save that. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-sm border border-black px-2.5 py-1 text-xs">
            Almost in
          </span>
          <h1 className="text-3xl font-bold leading-[1.05] lg:text-4xl">
            What should we call you?
          </h1>
          <p className="text-sm font-light text-black/70">
            Your username goes above every take you post, so pick one you can
            live with. It can be changed later, in the unlikely event you regret
            it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-semibold">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="irokocritic"
                className={`pr-10 ${fieldClass}`}
                disabled={isSubmitting}
                autoComplete="off"
                aria-invalid={usernameStatus?.available === false}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                {usernameStatus?.available === true
                  ? "✓"
                  : usernameStatus?.available === false
                    ? "✕"
                    : null}
              </span>
            </div>

            {showFormatHint ? (
              <p className="text-xs font-light text-red-700">
                3–20 characters. Letters, numbers, underscores and hyphens only.
              </p>
            ) : usernameStatus ? (
              <p
                className={`text-xs font-light ${
                  usernameStatus.available ? "text-black/60" : "text-red-700"
                }`}
              >
                {usernameStatus.message}
              </p>
            ) : (
              <p className="text-xs font-light text-black/60">
                3–20 characters. Letters, numbers, underscores and hyphens only.
              </p>
            )}

            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-light text-black/50">
                  Going spare:
                </span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setUsername(suggestion)}
                    className="cursor-pointer rounded-sm border border-black/40 px-2.5 py-1 text-xs transition-colors hover:bg-black hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="displayName" className="text-sm font-semibold">
              Display name{" "}
              <span className="font-light text-black/50">(optional)</span>
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="The name your friends use"
              className={fieldClass}
              disabled={isSubmitting}
            />
            <p className="text-xs font-light text-black/60">
              We have guessed from your account. Change it, or leave it.
            </p>
          </div>

          {error && <p className="text-sm font-light text-red-700">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!usernameStatus?.available || isSubmitting}
              className="cursor-pointer rounded-sm bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Done"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="cursor-pointer text-sm font-light text-black/60 underline underline-offset-2 hover:text-black"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
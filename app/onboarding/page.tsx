"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircleIcon, XCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { useStackApp, type CurrentUser } from '@stackframe/stack';
import { useDebounce } from '@/hooks/use-debounce';
import { emailLocalPart, usernameSuggestions, USERNAME_RE } from '@/lib/username';

interface UsernameCheck {
  available: boolean;
  message: string;
}

const fieldClass =
  "rounded-sm border-black/40 shadow-none focus-visible:border-black focus-visible:ring-black/20";

export default function OnboardingPage() {
  const router = useRouter();
  // useStackApp + an effect, not useUser(): useUser() suspends during SSR, which
  // would leave this whole page blank until hydration. The form shell does not
  // depend on the user, so it should render straight away.
  const app = useStackApp();
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedUsername = useDebounce(username, 500);

  // Prefill from whatever we already know: the OAuth display name if there is
  // one, otherwise the local part of their email. Both are editable — the point
  // is to save typing, not to name anybody without asking.
  useEffect(() => {
    if (prefilled) return;
    let cancelled = false;

    (async () => {
      const current = await app.getUser();
      if (cancelled || !current) return;
      setUser(current);
      setPrefilled(true);

      const fallbackName =
        current.displayName?.trim() || emailLocalPart(current.primaryEmail);
      setDisplayName(fallbackName);

      const existing = (current.clientMetadata as { username?: string } | null)?.username;
      if (existing?.trim()) {
        router.push('/');
        return;
      }

      loadSuggestions(current.displayName, current.primaryEmail);
    })();

    return () => {
      cancelled = true;
    };
  }, [app, prefilled, router]);

  const loadSuggestions = (
    displayNameSource: string | null,
    email: string | null,
  ) => {
    const candidates = usernameSuggestions([displayNameSource, emailLocalPart(email)]);
    if (candidates.length === 0) return;

    // One request answers the whole batch — the route scans every Stack user,
    // so asking per candidate would be that scan three times over.
    fetch('/api/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: candidates.slice(0, 6) }),
    })
      .then((response) => response.json())
      .then((data: { results?: { username: string; available: boolean }[] }) => {
        setSuggestions(
          (data.results ?? [])
            .filter((result) => result.available)
            .map((result) => result.username)
            .slice(0, 3),
        );
      })
      .catch((err) => console.error('Could not load username suggestions:', err));
  };

  const checkUsernameAvailability = useCallback(async (candidate: string) => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: candidate }),
      });
      const data = await response.json();
      setUsernameStatus(
        response.ok
          ? data
          : { available: false, message: data.error || 'Could not check that one' },
      );
    } catch (err) {
      console.error(err);
      setUsernameStatus({ available: false, message: 'Could not check that one' });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (USERNAME_RE.test(debouncedUsername)) {
      checkUsernameAvailability(debouncedUsername);
    } else {
      setUsernameStatus(null);
    }
  }, [debouncedUsername, checkUsernameAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameStatus?.available || !user) {
      setError('Pick a username that is still going spare.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/create-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stackUserId: user.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Could not save that. Try again.');
        return;
      }

      // Display name lives on the Stack user, not in clientMetadata — same call
      // the dashboard profile tab makes. Optional, so a blank one is fine.
      const trimmedName = displayName.trim();
      if (trimmedName !== (user.displayName ?? '')) {
        try {
          await user.update({ displayName: trimmedName });
        } catch (err) {
          // The username landed, which is the part that matters publicly
          console.error('Could not save display name:', err);
        }
      }

      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Could not save that. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFormatHint = username.length > 0 && !USERNAME_RE.test(username);

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="w-fit text-xs border border-black rounded-sm px-2.5 py-1">
            Almost in
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold leading-[1.05]">
            What should we call you?
          </h1>
          <p className="text-sm font-light text-black/70">
            Your username goes above every take you post, so pick one you can live
            with. It can be changed later, in the unlikely event you regret it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-sm font-semibold">
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="irokocritic"
                className={`pr-10 ${fieldClass}`}
                disabled={isSubmitting}
                autoComplete="off"
                aria-invalid={usernameStatus?.available === false}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking ? (
                  <CircleNotchIcon className="h-4 w-4 animate-spin text-black/40" />
                ) : usernameStatus?.available === true ? (
                  <CheckCircleIcon className="h-4 w-4" weight="fill" />
                ) : usernameStatus?.available === false ? (
                  <XCircleIcon className="h-4 w-4 text-red-700" weight="fill" />
                ) : null}
              </div>
            </div>

            {showFormatHint ? (
              <p className="text-xs font-light text-red-700">
                3–20 characters. Letters, numbers, underscores and hyphens only.
              </p>
            ) : usernameStatus ? (
              <p
                className={`text-xs font-light ${usernameStatus.available ? 'text-black/60' : 'text-red-700'}`}
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
                <span className="text-xs font-light text-black/50">Going spare:</span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setUsername(suggestion)}
                    className="text-xs border border-black/40 rounded-sm px-2.5 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName" className="text-sm font-semibold">
              Display name <span className="font-light text-black/50">(optional)</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
            <Button
              type="submit"
              disabled={!usernameStatus?.available || isSubmitting || isChecking}
              className="rounded-sm bg-black text-white hover:bg-black/80 px-5 py-3"
            >
              {isSubmitting ? 'Saving…' : 'Done'}
            </Button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm font-light text-black/60 underline underline-offset-2 hover:text-black cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

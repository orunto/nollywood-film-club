"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon } from "@phosphor-icons/react";

const DISMISSED_KEY = "nfc:username-prompt-dismissed";

// Shown to a signed-in member who never picked a username. Nothing is blocked —
// they can read, rate, review and comment exactly as before; without a username
// their reviews just carry their display name, or "Member" if they have neither.
// This only asks.
export default function SetUsernameBanner() {
  // Start hidden and reveal after reading localStorage, so a member who already
  // dismissed it never sees it flash in on the way through hydration.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
    } catch {
      // Private mode or storage disabled — showing it is the safer default
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do; it will come back next visit, which is acceptable
    }
  };

  if (!visible) return null;

  return (
    <div className="w-full border-b border-black/10 bg-black/5 px-6 py-3 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-light">
          You have not picked a username yet, so your takes are going out unsigned.{" "}
          <Link
            href="/onboarding"
            className="font-medium underline underline-offset-2 hover:text-black/60"
          >
            Fix that
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-black/40 hover:text-black cursor-pointer"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { EmptyListIllustration } from "../graphics/empty-states";
import { Input } from "../ui/input";

const inputClass =
  "rounded-sm border-black/20 shadow-none focus-visible:border-black focus-visible:ring-black/20";

// Admin API responses all wrap their payload in { success, data?, error?, message? }.
// response.json() is unknown in the project's DOM lib types, so this narrows it
// to the shared envelope. Callers pass the payload type as T.
export async function jsonResponse<T = unknown>(response: Response) {
  return (await response.json()) as {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    warning?: string;
    field?: string;
  };
}

// Page title block every admin section opens with.
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.2em] text-black/50">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

// Bordered white card used for tables and lists across the admin.
export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded border border-black/10 bg-white ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function AdminCardHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-black/50">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`max-w-sm ${inputClass}`}
    />
  );
}

export function AdminEmptyState({
  filtered,
  title,
  message,
}: {
  filtered: boolean;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded border border-black/10 bg-white px-6 py-16 text-center">
      <EmptyListIllustration className="mx-auto mb-4 w-24 text-black/70 md:w-28" />
      <h3 className="text-xl font-semibold">{filtered ? "No matches found" : title}</h3>
      <p className="mt-1 text-sm text-black/50">{message}</p>
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-black/10 rounded border border-black/10 bg-white">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 p-3">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-black/10" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-black/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Black pill badge used for the active/affirmative states in admin tables.
export const adminBadgeClass =
  "rounded-sm border-transparent bg-black text-[11px] font-semibold uppercase tracking-wide text-white";

// Outlined badge used for quieter/secondary states.
export const adminOutlineBadgeClass =
  "rounded-sm border border-black bg-transparent text-[11px] font-semibold uppercase tracking-wide text-black";

// Dimmed outline badge for muted states (dismissed, drafts).
export const adminMutedBadgeClass =
  "rounded-sm border border-black/30 bg-transparent text-[11px] font-semibold uppercase tracking-wide text-black/60";

export { inputClass };

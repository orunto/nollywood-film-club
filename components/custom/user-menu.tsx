"use client";

import { useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@stackframe/stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserIcon,
  ShieldCheckIcon,
  SignOutIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";

type UserMenuProps = {
  user: CurrentUser;
  isAdmin?: boolean;
};

function initialsOf(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UserMenu({ user, isAdmin = false }: UserMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const username = (user as { clientMetadata?: { username?: string } })
    .clientMetadata?.username;
  const label = username || user.displayName || user.primaryEmail || "Member";

  const onLogout = async () => {
    setIsLoading(true);
    try {
      await user.signOut();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <Avatar className="size-9 border border-white/20">
            {user.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} alt={label} />
            )}
            <AvatarFallback className="bg-white text-sm font-medium text-black">
              {initialsOf(label)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 rounded-sm border-black/10 shadow-none"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{label}</span>
          {user.primaryEmail && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.primaryEmail}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer rounded-sm">
          <Link href="/user-dashboard">
            <UserIcon weight="fill" />
            Profile
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-sm">
            <Link href="/admin">
              <ShieldCheckIcon weight="fill" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoading}
          onSelect={(e) => {
            e.preventDefault();
            onLogout();
          }}
          className="cursor-pointer rounded-sm"
        >
          {isLoading ? (
            <CircleNotchIcon className="animate-spin" />
          ) : (
            <SignOutIcon weight="fill" />
          )}
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

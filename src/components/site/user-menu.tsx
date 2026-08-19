"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../../auth/client";
import type { NavUser } from "./nav";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  UserIcon,
  ShieldCheckIcon,
  SignOutIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";

type UserMenuProps = {
  user: NavUser;
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
  const navigate = useNavigate();

  const label = user.username || user.displayName || user.primaryEmail || "Member";

  const onLogout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      navigate("/");
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
          <Link to="/user-dashboard">
            <UserIcon weight="fill" />
            Profile
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-sm">
            <Link to="/admin">
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
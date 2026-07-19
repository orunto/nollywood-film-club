"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { ListIcon } from "@phosphor-icons/react";
import { useState } from "react";
import UserMenu from "./user-menu";

// Serializable subset of the auth user needed to render the nav. Resolved on
// the server (see nav-server.tsx / getNavUser) so the client no longer performs
// its own getUser() round-trip on mount.
export interface NavUser {
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  username: string | null;
}

interface NavProps {
  user: NavUser | null;
  isAdmin: boolean;
}

export default function Nav({ user, isAdmin }: NavProps) {
    const [menu, setmenu] = useState(false);

    return (
        <nav className={"flex lg:flex-row flex-col justify-between items-center w-full bg-black lg:px-10 lg:py-3 text-white lg:overflow-hidden overflow-y-visible z-50 relative lg:max-h-[unset] max-h-16"}>
            <div className="relative z-10 bg-black flex items-center justify-between w-full lg:p-0 px-6 py-3 lg:w-max">
                <Link href="/">
                    <Image src="/assets/svg/logo.svg" alt="Nollywood Film Club logo" width={40} height={40} />
                </Link>

                <Button onClick={() => setmenu(!menu)} className="lg:hidden" size={'icon'} variant={'ghost'}>
                    <ListIcon />
                </Button>
            </div>
            <ul onClick={() => setmenu(false)} className={`${menu ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'} duration-300 relative text-base font-medium flex lg:flex-row flex-col lg:p-0 p-6 gap-8 items-center lg:w-max w-full bg-black`}>
                <li>
                    <Link href="/movies-and-tv">Movies &amp; TV Series</Link>
                </li>
                <li>
                    <Link href="/#reviews">Reviews</Link>
                </li>
                <li>
                    <Link href="/#discussions">Discussions</Link>
                </li>
                <li>
                    <Link href="/about">About</Link>
                </li>
                <li>
                    {user ? (
                        <UserMenu user={user} isAdmin={isAdmin} />
                    ) : (
                        <Link href="/auth">
                            <Button variant={'default'} className="text-base">
                                Join the Club
                            </Button>
                        </Link>
                    )}
                </li>
            </ul>
        </nav>
    );
}

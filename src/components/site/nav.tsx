"use client";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { ListIcon } from "@phosphor-icons/react";
import { useState } from "react";
import UserMenu from "./user-menu";

// Serializable subset of the auth user needed to render the nav. Resolved on
// the server (in the site layout loader) so the client no longer performs its
// own session round-trip on mount.
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
                <Link to="/">
                    <img src="/assets/svg/logo.svg" alt="Nollywood Film Club logo" width={40} height={40} />
                </Link>

                <Button onClick={() => setmenu(!menu)} className="lg:hidden" size={'icon'} variant={'ghost'}>
                    <ListIcon />
                </Button>
            </div>
            <ul onClick={() => setmenu(false)} className={`${menu ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'} duration-300 relative text-base font-medium flex lg:flex-row flex-col lg:p-0 p-6 gap-8 items-center lg:w-max w-full bg-black`}>
                <li>
                    <Link to="/movies-and-tv">Movies &amp; TV Series</Link>
                </li>
                <li>
                    <Link to="/scoreboard">NFC Scoreboard</Link>
                </li>
                <li>
                    <Link to="/reviews">Reviews</Link>
                </li>
                <li>
                    <Link to="/discussions">Discussions</Link>
                </li>
                <li>
                    <Link to="/about">About</Link>
                </li>
                <li>
                    <Link to="/contact">Contact</Link>
                </li>
                <li>
                    {user ? (
                        <UserMenu user={user} isAdmin={isAdmin} />
                    ) : (
                        <Link to="/auth">
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
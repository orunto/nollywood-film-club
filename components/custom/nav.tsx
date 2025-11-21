"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { MenuIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { User, useStackApp } from "@stackframe/stack";
export default function Nav() {
    const [menu, setmenu] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const app = useStackApp();

    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await app.getUser();
            setUser(currentUser);
            if (currentUser) {
                const userRole = (currentUser as { clientMetadata?: { role?: string } }).clientMetadata?.role;
                setIsAdmin(userRole === 'admin');
            }
        };
        checkUser();
    }, [app]);
    return (
        <nav className={"flex lg:flex-row flex-col justify-between items-center w-full bg-black lg:px-10 lg:py-3 text-white lg:overflow-hidden overflow-y-visible z-50 relative lg:max-h-[unset] max-h-16"}>
            <div className="relative z-10 bg-black flex items-center justify-between w-full lg:p-0 px-6 py-3 lg:w-max">
                <Link href="/">
                    <Image src="/assets/webp/logo-no-bg.webp" alt="Logo" width={40} height={40} />
                </Link>

                <Button onClick={() => setmenu(!menu)} className="lg:hidden" size={'icon'} variant={'ghost'}>
                    <MenuIcon />
                </Button>
            </div>
            <ul onClick={() => setmenu(false)} className={`${menu ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'} duration-300 relative text-base font-medium flex lg:flex-row flex-col lg:p-0 p-6 gap-8 items-center lg:w-max w-full bg-black`}>
                <li>
                    <Link href="/#spaces">Spaces</Link>
                </li>
                <li>
                    <Link href="/#reviews">Reviews</Link>
                </li>
                {isAdmin && (
                    <li>
                        <Link href="/admin">Admin</Link>
                    </li>
                )}
                <li>
                    {user ? (
                        <Link href="/user-dashboard">
                            <Button variant={'default'} className="text-base">
                                Profile
                            </Button>
                        </Link>
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
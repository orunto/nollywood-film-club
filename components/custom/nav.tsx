import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
export default function Nav() {
    return (
        <nav className="flex lg:flex-row flex-col justify-between items-center w-full bg-black lg:px-10 lg:py-3 text-white">
            <div className="flex items-center justify-between">
                <Link href="/">
                    <Image src="/assets/webp/logo.webp" alt="Logo" width={40} height={40} />
                </Link>
            </div>
            <ul className="text-base font-medium flex gap-8 items-center">
                <li>
                    <Link href="/spaces">Spaces</Link>
                </li>
                <li>
                    <Link href="/reviews">Reviews</Link>
                </li>
                <li>
                    <Link href="/about">
                        <Button variant={'default'} className="text-base">

                            Join the Club
                        </Button>
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
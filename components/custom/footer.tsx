import Link from "next/link";
export default function Footer() {
    return <footer className="w-full bg-black text-white lg:p-10 p-6">
        <div className="w-full flex lg:flex-row flex-col gap-6 justify-between items-center">
            <div className="flex flex-col gap-2">
                <span className="text-lg font-semibold">The Nollywood Film Club <sub>hosted by <Link href='https://linktr.ee/irokocritic' className="underline">Iroko Critic</Link></sub></span>
                <span className="text-xs font-light">Copyright © 2025. All rights reserved.</span>
                <span className="text-xs font-light">Open source project maintained by <Link href='https://orunto.vercel.app' className="underline text-green-600">orunto.dev</Link></span>
            </div>

            <div className="flex flex-col gap-3 text-sm lg:text-right text-left lg:items-end items-start lg:w-max w-full">
                <Link href='#spaces'>Spaces</Link>
                <Link href='#reviews'>Reviews</Link>
                <Link href='/auth'>Join the Club</Link>
                {/* <Link href='/about'>About</Link> */}
            </div>
        </div>
    </footer>
}
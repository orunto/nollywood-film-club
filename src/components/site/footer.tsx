import { Link } from "react-router";
export default function Footer() {
    return <footer className="w-full bg-black text-white lg:p-10 p-6">
        <div className="w-full flex lg:flex-row flex-col gap-6 justify-between">
            <div className="flex flex-col gap-2">
                <span className="text-lg font-semibold">The Nollywood Film Club <sub>hosted by <a href='https://linktr.ee/irokocritic' className="underline">Iroko Critic</a></sub></span>
                <span className="text-xs font-light">One film a week. The good, the bad, the pushback.</span>
                <span className="text-xs font-light">Copyright © 2026. All rights reserved.</span>
                <span className="text-xs font-light">Open source project maintained by <a href='https://orunto.dev' className="underline text-green-600">orunto.dev</a></span>
            </div>

            <div className="flex flex-col gap-3 text-sm lg:text-right text-left lg:items-end items-start lg:w-max w-full">
                <Link to='/movies-and-tv'>Movies &amp; TV</Link>
                <Link to='/discussions'>Discussions</Link>
                <Link to='/reviews'>Reviews</Link>
                <Link to='/about'>About</Link>
                <Link to='/contact'>Contact</Link>
                <Link to='/auth'>Join the Club</Link>
                <div className="flex gap-4 pt-2 text-xs text-white/60">
                    <Link to='/terms' className="hover:text-white">Terms</Link>
                    <Link to='/privacy' className="hover:text-white">Privacy</Link>
                </div>
            </div>
        </div>
    </footer>
}
import type { Metadata } from "next";
import Link from "next/link";
import {
    BroadcastIcon,
    BugIcon,
    CrownIcon,
    MicrophoneStageIcon,
    UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/custom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRegularUsers } from "@/lib/server-queries";

export const metadata: Metadata = {
    title: "About | Nollywood Film Club",
    description:
        "What Nollywood Film Club is, how Sundays work, and the people who keep showing up. One Nollywood film a week, live on X Spaces every Sunday at 6PM WAT.",
    openGraph: {
        title: "About | Nollywood Film Club",
        description:
            "What Nollywood Film Club is, how Sundays work, and the people who keep showing up. One Nollywood film a week, live on X Spaces every Sunday at 6PM WAT.",
    },
};

const STATS = [
    { number: "180+", label: "episodes and counting" },
    { number: "390+", label: "hours of yapping" },
    { number: "90+", label: "films and shows discussed" },
    { number: "1", label: "film a week, every week" },
];

const SEGMENTS = [
    {
        name: "The Good",
        blurb: "We say what we liked. Some weeks this section is short. Some weeks it is very short.",
    },
    {
        name: "The Bad",
        blurb: "We say what we didn't like. This section has never once been short.",
    },
    {
        name: "The Pushback",
        blurb: "We disagree with each other. Civil, spirited, occasionally personal about a fictional character.",
    },
    {
        name: "The Summary",
        blurb: "Everybody lands the plane. Verdicts are delivered. Friendships survive, mostly.",
    },
];

const HOUSE_RULES = [
    {
        rule: "Every opinion is valid.",
        detail:
            "Filmmaker or Nollywood newbie, that is how you consume Nollywood, and nobody can take that from you.",
    },
    {
        rule: "No personal or unrelated insults.",
        detail:
            "Tone can be as harsh as the spirit leads, but personal unrelated insults will be removed. Drag the film all you like. Leave the person out of it.",
    },
    {
        rule: "Watch the film before Sunday.",
        detail:
            "You will not be entertained by other people's pain. This is a community, and as such, we shall all commune.",
    },
];

export default async function AboutPage() {
    const regulars = await getRegularUsers();

    return (
        <>
            <main className="min-h-screen">
                {/* Intro — black band, same language as the hero, closed out by a
                    big-numeral stat strip (numbers as visual anchors) */}
                <section className="w-full bg-black text-white lg:px-10 px-6 lg:py-24 py-16 flex flex-col gap-6">
                    <span className="w-fit text-xs text-white bg-transparent border border-white rounded-sm px-2.5 py-1">
                        Est. 2022 · Still yapping
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] max-w-3xl">
                        What is Nollywood Film Club?
                    </h1>
                    <p className="text-base lg:text-lg font-light text-white/70 max-w-2xl">
                        It&apos;s a live conversation on X (Twitter) Spaces, hosted every Sunday
                        at 6PM West African Time by Mr C, one half of Iroko Critic. One
                        Nollywood film a week, discussed honestly and openly by anybody who
                        shows up, regardless of background or film knowledge. The podcast is
                        just the recording. The receipts, if you will.
                    </p>
                    <div className="grid lg:grid-cols-4 grid-cols-2 gap-6 pt-10 mt-4 border-t border-white/20">
                        {STATS.map((stat) => (
                            <div key={stat.label} className="flex flex-col gap-1">
                                <span className="text-4xl lg:text-5xl font-bold">{stat.number}</span>
                                <span className="text-xs font-light text-white/60">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="w-full flex flex-col lg:px-10 lg:py-16 py-10 px-6 gap-15">
                    {/* How Sundays work */}
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            How Sundays work
                        </h2>
                        <p className="pt-6 text-sm font-light text-black/70 max-w-2xl">
                            Everyone watches the film before Sunday. Then we gather, and the
                            discussion runs the same four segments every week, a format so
                            reliable you could set your disappointment to it.
                        </p>
                        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 lg:divide-x divide-black/10 py-6">
                            {SEGMENTS.map((segment, index) => (
                                <div key={segment.name} className="flex flex-col gap-2 lg:px-6 first:pl-0 last:pr-0 py-4 lg:py-0">
                                    <span aria-hidden className="text-6xl lg:text-7xl font-bold text-black/10 leading-none">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-base font-bold">{segment.name}</h3>
                                    <p className="text-sm font-light text-black/70">{segment.blurb}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* The NFC score */}
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            The NFC score
                        </h2>
                        <p className="pt-6 text-sm font-light text-black/70 max-w-2xl">
                            After the discussion, members say whether they liked the film,
                            thought it was okay, or did not like it. The average becomes the
                            NFC score, and we show it as a percentage. No weighting, no secret
                            formula. Everybody&apos;s rating counts exactly the same. Equally
                            worse than Mr C&apos;s, obviously, but it counts.
                        </p>
                    </section>

                    {/* House rules */}
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            The house rules
                        </h2>
                        <div className="flex flex-col divide-y divide-black/10">
                            {HOUSE_RULES.map((item) => (
                                <div key={item.rule} className="py-5 grid lg:grid-cols-3 gap-2">
                                    <h3 className="text-base font-bold">{item.rule}</h3>
                                    <p className="lg:col-span-2 text-sm font-light text-black/70">
                                        {item.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* The people — hosts get inverted black cards; everyone gets an
                        icon tile and a role badge so the grid reads as a cast list */}
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            The people
                        </h2>
                        <div className="grid lg:grid-cols-3 grid-cols-1 gap-6 py-6">
                            <div className="rounded-sm bg-black text-white p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-sm bg-white text-black flex items-center justify-center">
                                        <MicrophoneStageIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs border border-white rounded-sm px-2.5 py-1">
                                        Host
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-base font-bold">Mr C</h3>
                                    <p className="text-sm font-light text-white/70">
                                        Your host. One half of Iroko Critic. Always crushing it,
                                        never makes a mistake, 100% of the time. His words, and who
                                        are we to argue with the man holding the microphone.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-sm bg-black text-white p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-sm bg-white text-black flex items-center justify-center">
                                        <CrownIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs border border-white rounded-sm px-2.5 py-1">
                                        Co-host
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-base font-bold">Mrs C</h3>
                                    <p className="text-sm font-light text-white/70">
                                        The other half of Iroko Critic, and the reason episodes
                                        occasionally end on time. Hosts when Mr C is away, which he
                                        describes as &quot;an adequate job.&quot; It is more than adequate.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-sm border border-black/10 p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 rounded-sm bg-black text-white flex items-center justify-center">
                                        <UsersIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs border border-black rounded-sm px-2.5 py-1">
                                        The community
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-base font-bold">NFC Miscreants</h3>
                                    <p className="text-sm font-light text-black/70">
                                        The members who show up week after week to share detailed,
                                        funny, occasionally devastating takes, lovingly described by
                                        Mr C as &quot;weapons fashioned against me.&quot; Some fought
                                        two VPNs just to watch the homework. That is commitment.
                                    </p>
                                    {regulars.length > 0 ? (
                                        <div className="flex flex-wrap gap-3 pt-2">
                                            {regulars.map((user) => (
                                                <Link
                                                    key={user.id}
                                                    href={`/members/${user.username}`}
                                                    className="flex flex-col items-center gap-1.5 w-16 group"
                                                >
                                                    <Avatar className="size-10 border border-black/10">
                                                        {user.profileImage && (
                                                            <AvatarImage src={user.profileImage} alt={user.username} />
                                                        )}
                                                        <AvatarFallback className="bg-black text-sm font-medium text-white">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-black/70 truncate w-full text-center group-hover:underline">
                                                        @{user.username}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="pt-2 text-xs font-light text-black/50">
                                            No miscreants crowned yet — check back after Sunday.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Join */}
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            Join us
                        </h2>
                        <p className="pt-6 text-sm font-light text-black/70 max-w-2xl">
                            Come for the films. Stay because you&apos;ve formed opinions and now
                            you need witnesses. Join live on Sundays, or listen to the podcast
                            after. Or don&apos;t.
                        </p>
                        <div className="flex flex-wrap gap-3 py-6">
                            <Link
                                href="/auth"
                                className="inline-flex items-center gap-2 bg-black text-white rounded-sm text-sm font-medium px-5 py-3 hover:bg-black/80 transition-colors"
                            >
                                <UsersIcon className="w-4 h-4" />
                                Join the Club
                            </Link>
                            <a
                                href="https://x.com/irokocritic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 border border-black rounded-sm text-sm font-medium px-5 py-3 text-black hover:bg-black hover:text-white transition-colors"
                            >
                                <MicrophoneStageIcon className="w-4 h-4" />
                                Follow @irokocritic
                            </a>
                            <a
                                href="https://linktr.ee/irokocritic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 border border-black rounded-sm text-sm font-medium px-5 py-3 text-black hover:bg-black hover:text-white transition-colors"
                            >
                                <BroadcastIcon className="w-4 h-4" />
                                Listen to the Podcast
                            </a>
                            <Link
                                href="/contact"
                                className="inline-flex items-center gap-2 border border-black rounded-sm text-sm font-medium px-5 py-3 text-black hover:bg-black hover:text-white transition-colors"
                            >
                                <BugIcon className="w-4 h-4" />
                                Found a bug?
                            </Link>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </>
    );
}

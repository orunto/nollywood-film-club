import type { Route } from "./+types/contact";
import {
    BugIcon,
    ChatCircleDotsIcon,
    LightbulbIcon,
} from "@phosphor-icons/react";
import Footer from "../../components/site/footer";
import ContactForm from "../../components/site/contact-form";
import { pageMeta } from "../../lib/meta";

export const meta: Route.MetaFunction = () =>
    pageMeta({
        title: "Contact | Nollywood Film Club",
        description:
            "Found a bug on the site, or have an idea for how it should work? Tell the Nollywood Film Club team.",
        path: "/contact",
    });

const WHAT_TO_SEND = [
    {
        Icon: BugIcon,
        title: "Something is broken",
        blurb:
            "A button that does nothing, a page that will not load, a rating that refuses to save. Tell us what you clicked and what happened next.",
    },
    {
        Icon: LightbulbIcon,
        title: "Something could be better",
        blurb:
            "A feature you keep reaching for and cannot find. No idea is too small. Some of them might even get built.",
    },
    {
        Icon: ChatCircleDotsIcon,
        title: "Something else entirely",
        blurb:
            "Not a bug, not quite an idea, just something on your mind about the site. Tell us. We can't promise a fix, but we can promise it gets read.",
    },
];

export default function ContactPage() {
    return (
        <>
            <main className="min-h-screen">
                <section className="w-full bg-black text-white lg:px-10 px-6 lg:py-24 py-16 flex flex-col gap-6">
                    <span className="w-fit text-xs text-white bg-transparent border border-white rounded-sm px-2.5 py-1">
                        Contact us
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] max-w-3xl">
                        Something broken? Something missing?
                    </h1>
                    <p className="text-base lg:text-lg font-light text-white/70 max-w-2xl">
                        This form is for the site, not the films. Bugs, broken pages, ideas
                        for what should exist here, or anything else on your mind, go below.
                        Opinions about the films go in the reviews, where everybody can argue
                        with them properly.
                    </p>
                </section>

                <div className="w-full flex flex-col lg:px-10 lg:py-16 py-10 px-6 gap-15">
                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            What to send
                        </h2>
                        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6 py-6">
                            {WHAT_TO_SEND.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-sm border border-black/10 p-6 flex flex-col gap-4"
                                >
                                    <div className="w-14 h-14 rounded-sm bg-black text-white flex items-center justify-center">
                                        <item.Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-base font-bold">{item.title}</h3>
                                        <p className="text-sm font-light text-black/70">
                                            {item.blurb}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="w-full">
                        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
                            Send it
                        </h2>
                        <p className="pt-6 pb-8 text-sm font-light text-black/70 max-w-2xl">
                            You do not need an account for this. Leave an email if you want a
                            reply, or don&apos;t and remain a mystery to us forever.
                        </p>
                        <ContactForm />
                    </section>
                </div>
            </main>
            <Footer />
        </>
    );
}
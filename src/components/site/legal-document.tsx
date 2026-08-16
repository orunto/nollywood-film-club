import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import Footer from "./footer";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  description: string;
  summary: string[];
  sections: LegalSection[];
}

export default function LegalDocument({
  title,
  description,
  summary,
  sections,
}: LegalDocumentProps) {
  return (
    <>
      <main className="min-h-screen bg-white">
        <header className="bg-black px-6 py-16 text-white lg:px-10 lg:py-24">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-light leading-7 text-white/70 lg:text-lg">
              {description}
            </p>
            <p className="mt-8 text-xs text-white/55">Effective 14 August 2026</p>
          </div>
        </header>

        <section aria-labelledby="short-version" className="border-b border-black bg-black text-white">
          <div className="grid lg:grid-cols-[minmax(12rem,0.7fr)_repeat(3,minmax(0,1fr))] lg:px-10">
            <h2 id="short-version" className="px-6 py-6 text-lg font-semibold lg:px-0 lg:pr-8">
              The short version
            </h2>
            {summary.map((item) => (
              <p
                key={item}
                className="border-t border-white/20 px-6 py-6 text-sm font-light leading-6 text-white/75 lg:border-l lg:border-t-0"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <div className="grid gap-12 px-6 py-12 lg:grid-cols-[minmax(13rem,0.65fr)_minmax(0,2fr)] lg:px-10 lg:py-16">
          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <h2 className="border-b border-black pb-3 text-sm font-semibold">On this page</h2>
            <nav aria-label={`${title} sections`}>
              <ul className="divide-y divide-black/10">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block py-3 text-sm text-black/60 transition-colors hover:text-black focus-visible:text-black"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
            >
              Contact the club
              <ArrowUpRightIcon aria-hidden className="size-4" />
            </Link>
          </aside>

          <article className="min-w-0 max-w-[72ch] divide-y divide-black/10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 py-10 first:pt-0">
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">{section.title}</h2>
                <div className="mt-5 space-y-4 text-sm font-light leading-7 text-black/70 [&_a]:font-medium [&_a]:text-black [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-black [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
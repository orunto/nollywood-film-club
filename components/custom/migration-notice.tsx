import { ProhibitIcon } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/custom";

// Shown in place of any data-driven page while the site is down for a
// database migration. Static pages (about, contact, privacy, terms) keep
// rendering normally; these pages depend on Neon, so they fail gracefully
// with a note instead of an empty or broken layout.
export default function MigrationNotice() {
  return (
    <>
      <main className="min-h-screen">
        <section className="flex min-h-screen w-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-black text-white">
            <ProhibitIcon className="h-8 w-8" />
          </div>
          <span className="w-fit border border-black rounded-sm px-2.5 py-1 text-xs">
            Down for a migration
          </span>
          <h1 className="max-w-2xl text-4xl lg:text-5xl font-bold leading-[1.05]">
            We&apos;re down for a quick migration.
          </h1>
          <p className="max-w-md text-sm font-light text-black/70">
            The database is moving to a new home. The films, the reviews and the
            receipts are all still here — we are just carrying them across. Hang
            tight, we&apos;ll be back shortly.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
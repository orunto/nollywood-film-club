import { Suspense } from "react";
import type { Metadata } from "next";
import { Footer } from "@/components/custom";
import { getAllContent } from "@/lib/server-queries";
import BrowseContent from "./browse-content";

export const metadata: Metadata = {
    title: "Movies & TV | Nollywood Film Club",
    description:
        "Every movie, TV series, and short film Nollywood Film Club has discussed. Filter by year, streaming service, genre, and the score it earned. The catalogue remembers everything, even the ones we'd rather forget.",
};

export default async function MoviesAndTVPage() {
    const allContent = await getAllContent();

    return (
        <>
            <main className="min-h-screen">
                <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 min-h-screen">
                    <section className="w-full">
                        
                        <Suspense
                            fallback={
                                <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6 py-6">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <div key={index} className="rounded-sm border h-80 bg-gray-100 animate-pulse" />
                                    ))}
                                </div>
                            }
                        >
                            <BrowseContent allContent={allContent} />
                        </Suspense>
                    </section>
                </div>
            </main>
            <Footer />
        </>
    );
}

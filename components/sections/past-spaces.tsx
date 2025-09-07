
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Badge } from "../ui/badge";
import { usePastSpaces } from "@/lib/hooks/use-content";
import { Skeleton } from "@/components/ui/skeleton";
// import { Button } from "../ui/button";
export default function PastSpaces() {
    const { data: pastSpaces, isLoading, error } = usePastSpaces();

    if (isLoading) {
        return (
            <section id="spaces" className="w-full">
                <div className="flex justify-between items-center w-full border-b border-black">
                    <h1 className="pb-3 border-black text-2xl font-semibold">Past Spaces</h1>

                    <Link href="/spaces" className="underline text-sm hover:">View All</Link>
                </div>
                <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="rounded-sm shadow-none p-0 gap-8">
                            <CardHeader className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                                <Skeleton className="w-full aspect-video rounded-sm translate-y-4 relative z-10" />
                            </CardHeader>
                            <CardContent className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                            <CardFooter className="p-4 flex justify-between border-t items-start">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-12" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section id="spaces" className="w-full">
                <div className="flex justify-between items-center w-full border-b border-black">
                    <h1 className="pb-3 border-black text-2xl font-semibold">Past Spaces</h1>

                    <Link href="/spaces" className="underline text-sm hover:">View All</Link>
                </div>
                <div className="py-6 text-center">
                    <p className="text-red-500">Failed to load past spaces</p>
                </div>
            </section>
        );
    }

    return <section id="spaces" className="w-full">
        <div className="flex justify-between items-center w-full border-b border-black">
            <h1 className="pb-3 border-black text-2xl font-semibold">Past Spaces</h1>

            <Link href="/spaces" className="underline text-sm hover:">View All</Link>
        </div>

        {pastSpaces && pastSpaces.length > 0 ? (
            <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 gap-4">
                {pastSpaces.map((space, index) => (
                    <Link key={index} href={`/spaces/${space.id}`}>
                        <Card className="rounded-sm shadow-none p-0 gap-8">
                            <CardHeader className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                                <CldImage
                                    src={space.posterImage || "nollywood-film-club/elj"}
                                    alt={`${space.title} Poster`}
                                    width={400}
                                    height={400}
                                    className="w-full aspect-video object-cover rounded-sm translate-y-4 relative z-10"
                                    quality="auto"
                                    format="auto"
                                />
                            </CardHeader>

                            <CardContent className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <CardTitle className="lg:text-xl font-semibold flex items-center gap-2">
                                    {space.title}
                                    {space.rating && <Badge className="text-xs text-black bg-transparent border border-black">{space.rating}</Badge>}
                                </CardTitle>

                                <CardDescription className="text-sm font-light">
                                    {space.contentType === 'movie' ? 'Movie' : 'TV Show'}
                                </CardDescription>
                            </CardContent>

                            <CardFooter className="p-4 flex justify-between border-t items-start">
                                <span className="text-black/40 text-sm">NFC SCORE</span>
                                <Badge className="text-xl font-medium bg-green-600 p-4">8.5</Badge>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        ) : (
            <div className="lg:py-10 py-6">
                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-sm shadow-none p-0 gap-8 flex flex-col border">
                            <div className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                                <div className="w-full aspect-video bg-gray-200 rounded-sm translate-y-4 relative z-10 flex items-center justify-center">
                                    <div className="text-4xl">🎬</div>
                                </div>
                            </div>
                            <div className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                            <div className="p-4 flex justify-between border-t items-start">
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="h-8 bg-gray-200 rounded w-12"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <h2 className="text-xl font-semibold mb-2">Coming Soon...</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Past spaces will appear here once we update them. In the meantime you can check out the recordings:
                    </p>
                     <div className="flex justify-center">
                         <Link
                             href="https://linktr.ee/irokocritic"
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white border border-green-500 rounded-lg hover:bg-white hover:!text-green-500 hover:[&>svg]:[&>path]:fill-green-500 hover:!no-underline transition-all duration-200 font-medium"
                         >
                             <svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.7599 6.82888L20.4322 2.02579L23.1441 4.80309L18.2431 9.47548H25.1372V13.331H18.2104L23.1441 18.1232L20.4322 20.8461L13.7341 14.1152L7.03604 20.8461L4.32414 18.1341L9.25784 13.3419H2.33105V9.47548H9.22516L4.32414 4.80309L7.03604 2.02579L11.7084 6.82888V0H15.7599V6.82888ZM11.7084 18.8529H15.7599V28.0017H11.7084V18.8529Z" fill="#fff"></path></svg>
                             Listen on All Platforms
                         </Link>
                     </div>
                </div>
            </div>
        )}
    </section>
}
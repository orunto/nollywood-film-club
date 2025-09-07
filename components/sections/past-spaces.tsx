
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
            <section className="w-full">
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
            <section className="w-full">
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

    return <section className="w-full">
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
                        Past spaces will appear here once we update them. In the meantime you can check them out the recordings on the following platforms:
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 [&>a]:hover:!no-underline">
                        <Link
                            href="https://open.spotify.com/show/your-podcast-id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-green-500 bg-green-500 text-white rounded-lg hover:bg-white hover:!text-green-500 "
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Spotify
                        </Link>
                        <Link
                            href="https://podcasts.apple.com/podcast/your-podcast-id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-800 bg-gray-800 text-white rounded-lg hover:bg-white hover:!text-gray-800 "
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            Apple
                        </Link>
                        <Link
                            href="https://podcasts.google.com/feed/your-podcast-id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-500 text-white rounded-lg hover:bg-white hover:!text-blue-500 "
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </Link>
                        <Link
                            href="https://www.audible.com/pd/your-podcast-id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-orange-500 bg-orange-500 text-white rounded-lg hover:bg-white hover:!text-orange-500 "
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Audible
                        </Link>
                    </div>
                </div>
            </div>
        )}
    </section>
}
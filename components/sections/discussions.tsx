
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Content } from "@/lib/server-queries";
import { Calendar, Clock, Mic2, Podcast, Youtube, ExternalLink } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../ui/alert-dialog";

interface DiscussionsProps {
    discussions: Content[];
}

export default function Discussions({ discussions }: DiscussionsProps) {
    return <section id="discussions" className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Discussions</h1>

        {discussions && discussions.length > 0 ? (
            <div className="grid lg:grid-cols-2 md:grid-cols-1 lg:py-10 py-6 lg:gap-8 gap-6">
                {discussions.map((discussion, index) => (
                    <Card key={index} className="rounded-sm shadow-none p-6 border border-black/10 flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-0 mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                                        {discussion.contentType === 'movie' ? 'Movie Discussion' : 'TV Show Discussion'}
                                    </Badge>
                                    {discussion.releaseDate && (
                                        <div className="flex items-center gap-1 text-xs text-black/60">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(discussion.releaseDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    )}
                                </div>
                                <CardTitle className="lg:text-2xl font-bold">
                                    {discussion.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-0 mb-6">
                                <CardDescription className="text-base font-light text-black/70 line-clamp-3">
                                    {discussion.synopsis || "Join our deep dive into this Nollywood masterpiece."}
                                </CardDescription>
                                
                                <div className="mt-4 flex flex-wrap gap-4">
                                    {discussion.runtime && (
                                        <div className="flex items-center gap-1.5 text-sm text-black/80">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <span>{discussion.runtime} mins</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </div>

                        <CardFooter className="p-0 pt-6 border-t flex flex-wrap gap-3">
                            {(discussion.spaceUrl || (discussion.podcastLinks && discussion.podcastLinks.length > 0)) ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-sm text-sm hover:bg-black/80 transition-colors cursor-pointer">
                                            <Mic2 className="w-4 h-4" />
                                            Listen to Space
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Listen to {discussion.title}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Choose your preferred platform to listen to the recording of this discussion.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="flex flex-col gap-2 py-4">
                                            {discussion.spaceUrl && (
                                                <a
                                                    href={discussion.spaceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Mic2 className="w-5 h-5" />
                                                        <span className="font-medium">Twitter Space Link</span>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                            )}
                                            {discussion.podcastLinks?.map((link, idx) => {
                                                const isSpotify = link.includes('spotify');
                                                const isYoutube = link.includes('youtube');
                                                
                                                return (
                                                    <a
                                                        key={idx}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isSpotify ? <Podcast className="w-5 h-5 text-[#1DB954]" /> : isYoutube ? <Youtube className="w-5 h-5 text-[#FF0000]" /> : <Podcast className="w-5 h-5" />}
                                                            <span className="font-medium">
                                                                {isSpotify ? 'Spotify Link' : isYoutube ? 'Youtube Music Link' : 'Podcast Link'}
                                                            </span>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                )
                                            })}
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Close</AlertDialogCancel>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <span className="text-sm text-black/40 italic">Recording coming soon...</span>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="lg:py-10 py-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Coming Soon...</h2>
                <p className="text-gray-600 text-sm">
                    More discussions will appear here soon.
                </p>
            </div>
        )}
    </section>
}

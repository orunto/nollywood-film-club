import { forwardRef } from "react";
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Badge } from "../ui/badge";
import { Content } from "@/lib/server-queries";
import { cn, scoreBadgeClass, contentTypeLabel } from "@/lib/utils";

interface ContentCardProps {
    item: Content;
    className?: string;
}

const ContentCard = forwardRef<HTMLAnchorElement, ContentCardProps>(
    function ContentCard({ item, className, ...rest }, ref) {
        return (
            <Link href={`movies/${item.id}`} ref={ref} className={cn(className)} {...rest}>
                <Card className="rounded-sm h-full shadow-none p-0 2xl:gap-12 gap-8">
                    <CardHeader className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                        <CldImage
                            src={item.posterImage || "nollywood-film-club/elj"}
                            alt={`${item.title} Poster`}
                            width={400}
                            height={400}
                            className="w-full aspect-video hover:aspect-[8/9] object-cover object-top rounded-sm translate-y-4 relative z-10 transition-[aspect-ratio] duration-300 ease-in-out"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            loading="lazy"
                        />
                    </CardHeader>

                    <CardContent className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                        <CardTitle className="lg:text-xl font-semibold flex items-center gap-2">
                            {item.title}
                        </CardTitle>

                        <CardDescription className="flex items-center gap-2">
                            <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                                {contentTypeLabel(item.contentType)}
                            </Badge>
                            {item.rating && (
                                <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                                    {item.rating}
                                </Badge>
                            )}
                        </CardDescription>

                        {item.synopsis && (
                            <p className="text-xs text-black/60 font-light line-clamp-3">
                                {item.synopsis}
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="p-4 flex justify-between border-t items-start">
                        <span className="text-black/40 text-sm">NFC SCORE</span>
                        <Badge
                            className={cn(
                                "font-medium h-15 w-15 p-4",
                                item.userRating === null ? "text-sm" : "text-xl",
                                scoreBadgeClass(item.userRating),
                            )}
                        >
                            {item.userRating ?? "N/A"}
                        </Badge>
                    </CardFooter>
                </Card>
            </Link>
        );
    },
);

export default ContentCard;

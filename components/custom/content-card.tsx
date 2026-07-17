import { forwardRef, memo } from "react";
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Badge } from "../ui/badge";
import { Content } from "@/lib/server-queries";
import { cn, scoreBadgeClass, contentTypeLabel, contentPath } from "@/lib/utils";

interface ContentCardProps {
    item: Content;
    className?: string;
}

const ContentCard = forwardRef<HTMLAnchorElement, ContentCardProps>(
    function ContentCard({ item, className, ...rest }, ref) {
        return (
            <Link href={contentPath(item)} ref={ref} className={cn(className)} {...rest}>
                <Card className="@container rounded-sm h-full shadow-none p-0 2xl:gap-12 gap-8">
                    <CardHeader className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                        {/* Static 16:9 box; the absolutely-positioned inner container is
                            what grows on hover (to 200% = the old 112.5% of width), so the
                            animation can never contribute to layout and push the card body */}
                        <div className="w-full pt-[56.25%] relative translate-y-4 z-10">
                            <div className="absolute inset-x-0 top-0 h-full hover:h-[200%] transition-[height] duration-300 ease-in-out">
                                <CldImage
                                    src={item.posterImage || "nollywood-film-club/elj"}
                                    version={item.posterVersion ?? undefined}
                                    alt={`${item.title} Poster`}
                                    fill
                                    className="object-cover object-top rounded-sm"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                        <CardTitle className="text-base @xs:text-lg @md:text-xl font-semibold flex items-center gap-2 mt-5 lg:mt-0">
                            {item.title}
                        </CardTitle>

                        <CardDescription className="flex flex-wrap items-center gap-2">
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
                        <span className="text-black/40 text-xs @sm:text-sm">NFC SCORE</span>
                        <Badge
                            className={cn(
                                "font-medium h-12 w-12 @sm:h-15 @sm:w-15 p-4",
                                item.userRating === null ? "text-sm" : "text-lg @sm:text-xl",
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

// Memoised because the browse page re-renders on every keystroke of its search
// box: each card rebuilds a Cloudinary URL (~0.7ms), so an unmemoised grid burns
// ~8ms per keystroke before React even reconciles. `item` comes straight from the
// fetched catalogue, so its identity is stable across those renders.
export default memo(ContentCard);


import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "../ui/badge";
export default function Reviews() {
    const reviews = [
        {
            title: "Everybody Loves Jenifa",
            description: "A hilarious comedy series that follows Jenifa's misadventures in Lagos. Perfect blend of humor and social commentary.",
            score: 8.5
        },
        {
            title: "The Wedding Party",
            description: "An entertaining romantic comedy that captures the essence of Nigerian weddings with all their drama and celebration.",
            score: 7.8
        },
        {
            title: "King of Boys",
            description: "A gripping political thriller that explores power, corruption, and survival in Lagos underworld. Intense and compelling.",
            score: 9.2
        },
        {
            title: "Lionheart",
            description: "A heartwarming family drama about a woman navigating corporate Nigeria while preserving her family's legacy.",
            score: 8.1
        }
    ];

    return <section className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Reviews</h1>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 lg:gap-4 gap-6">
            {
                reviews.map((review, index) => (
                    <Link key={index} href={`/reviews/${index}`}>
                        <Card className="rounded-sm shadow-none p-0 gap-4 border-none">
                            <CardHeader className="p-0 relative z-10 rounded-t-sm">
                                <Image src={`/assets/webp/elj.webp`} alt={`${review.title}`} width={400} height={400} className="w-full aspect-video object-cover rounded-sm relative z-10" />
                            </CardHeader>

                            <CardContent className="p-0 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <CardTitle className="lg:text-lg font-semibold flex items-center gap-2 flex-wrap">{review.title} <Badge className="text-xs text-black bg-transparent border border-black">Tv series</Badge></CardTitle>
                                <span className="text-black/40 text-xs">WKMUp</span>

                                <CardDescription className="text-xs font-light">{review.description}</CardDescription>
                            </CardContent>

                            <CardFooter className="p-0 flex justify-between border-t items-start">
                            <Badge className="text-xs text-black bg-transparent border border-black">{review.score}</Badge>
                            </CardFooter>
                        </Card>
                    </Link>
                ))
            }
        </div>
    </section>
}
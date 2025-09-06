
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "../ui/badge";
export default function PastSpaces() {
    return <section className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Past Spaces</h1>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 gap-4">
            {
                Array.from({ length: 4 }).map((_, index) => (
                    <Link key={index} href={`/spaces/${index}`}>
                        <Card className="rounded-sm shadow-none p-0 gap-8">
                            <CardHeader className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                                <Image src={`/assets/webp/elj.webp`} alt={`Space ${index + 1}`} width={400} height={400} className="w-full aspect-video object-cover rounded-sm translate-y-4 relative z-10" />
                            </CardHeader>

                            <CardContent className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <CardTitle className="lg:text-xl font-semibold flex items-center gap-2">Space {index + 1} <Badge className="text-xs text-black bg-transparent border border-black">PG-13</Badge></CardTitle>

                                <CardDescription className="text-sm font-light">TV Series</CardDescription>
                            </CardContent>

                            <CardFooter className="p-4 flex justify-between border-t items-start">
                                <span className="text-black/40 text-sm">NFC SCORE</span>

                                <Badge className="text-xl font-medium bg-green-600 p-4">8.5</Badge>
                            </CardFooter>
                        </Card>
                    </Link>
                ))
            }
        </div>
    </section>
}
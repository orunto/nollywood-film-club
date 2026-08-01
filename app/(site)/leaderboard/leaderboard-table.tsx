"use client";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ScoreBox from "@/components/custom/score-box";
import type { Content } from "@/lib/server-queries";
import { contentPath, contentTypeLabel } from "@/lib/utils";

export default function LeaderboardTable({ ranked }: { ranked: Content[] }) {
  return (
    <div className="mt-6 border border-black/10 rounded-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-black/10 hover:bg-transparent">
            <TableHead className="text-black w-12">#</TableHead>
            <TableHead className="text-black">Title</TableHead>
            <TableHead className="text-black">Type</TableHead>
            <TableHead className="text-black">Year</TableHead>
            <TableHead className="text-black text-right">NFC Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((item, index) => {
            const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
            return (
              <TableRow key={item.id} className="border-black/10 hover:bg-black/5">
                <TableCell className="text-black/40 font-semibold">{index + 1}</TableCell>
                <TableCell className="whitespace-normal">
                  <Link href={contentPath(item)} className="flex items-center gap-3 group w-fit">
                    {item.posterImage && (
                      <CldImage
                        src={item.posterImage}
                        version={item.posterVersion ?? undefined}
                        alt=""
                        width={44}
                        height={64}
                        className="h-16 w-11 shrink-0 rounded-sm object-cover"
                        sizes="44px"
                        loading="lazy"
                      />
                    )}
                    <span className="font-semibold group-hover:underline">{item.title}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                    {contentTypeLabel(item.contentType)}
                  </Badge>
                </TableCell>
                <TableCell className="text-black/60">{year ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <ScoreBox score={item.userRating} className="ml-auto h-12 w-12 text-base" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

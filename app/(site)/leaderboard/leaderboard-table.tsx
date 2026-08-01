"use client";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, contentPath, contentTypeLabel, nfcPercent, scoreBadgeClass } from "@/lib/utils";
import type { Content } from "@/lib/server-queries";

// Every cell gets a right-hand border, matching Table's built-in bottom
// border on rows, so the grid reads as a spreadsheet rather than a card list.
const cellBorder = "border-r border-black/10 last:border-r-0";

export default function LeaderboardTable({ ranked }: { ranked: Content[] }) {
  return (
    <div className="mt-6 border border-black/10 rounded-sm">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-black/10 bg-black/5 hover:bg-black/5">
            <TableHead className={cn("text-black/60 font-mono text-xs w-10 py-1.5", cellBorder)}>#</TableHead>
            <TableHead className={cn("text-black/60 font-mono text-xs py-1.5", cellBorder)}>Title</TableHead>
            <TableHead className={cn("text-black/60 font-mono text-xs w-28 py-1.5", cellBorder)}>Type</TableHead>
            <TableHead className={cn("text-black/60 font-mono text-xs w-16 py-1.5", cellBorder)}>Year</TableHead>
            <TableHead className="text-black/60 font-mono text-xs w-20 py-1.5 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((item, index) => {
            const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
            const percent = nfcPercent(item.userRating);
            return (
              <TableRow
                key={item.id}
                className="border-black/10 even:bg-black/[0.02] hover:bg-black/5"
              >
                <TableCell className={cn("py-1.5 font-mono text-xs text-black/40", cellBorder)}>
                  {index + 1}
                </TableCell>
                <TableCell className={cn("py-1.5 whitespace-normal", cellBorder)}>
                  <Link href={contentPath(item)} className="flex items-center gap-2 group w-fit">
                    {item.posterImage && (
                      <CldImage
                        src={item.posterImage}
                        version={item.posterVersion ?? undefined}
                        alt=""
                        width={24}
                        height={32}
                        className="h-8 w-6 shrink-0 rounded-[2px] object-cover"
                        sizes="24px"
                        loading="lazy"
                      />
                    )}
                    <span className="text-sm font-medium group-hover:underline truncate">
                      {item.title}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className={cn("py-1.5 text-xs text-black/60", cellBorder)}>
                  {contentTypeLabel(item.contentType)}
                </TableCell>
                <TableCell className={cn("py-1.5 font-mono text-xs text-black/60", cellBorder)}>
                  {year ?? "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right">
                  <span
                    className={cn(
                      "inline-block rounded-[2px] px-1.5 py-0.5 font-mono text-xs font-semibold text-white",
                      scoreBadgeClass(item.userRating),
                    )}
                  >
                    {percent === null ? "N/A" : `${percent}%`}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

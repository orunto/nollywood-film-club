"use client";
import { useState } from "react";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { EyeIcon } from "@phosphor-icons/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHead, useTableSort, type SortAccessors } from "@/components/ui/table-sort";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn, contentPath, contentTypeLabel, nfcPercent, scoreBadgeClass } from "@/lib/utils";
import type { ScoreboardEntry } from "@/lib/server-queries";

// Below `sm`, the grid collapses to just Title and Score — the columns that
// answer "how did this one do." Everything else moves into the detail sheet
// behind the eye icon.
const mobileHidden = "hidden sm:table-cell";

// Every cell gets a right-hand border, matching Table's built-in bottom
// border on rows, so the grid reads as a spreadsheet rather than a card list.
const cellBorder = "border-r border-black/10 last:border-r-0";
const headButton = "font-mono text-xs text-black/60 h-auto py-1.5 px-2 justify-start";

const sortAccessors: SortAccessors<ScoreboardEntry> = {
  catalog: (item) => item.catalogNumber,
  title: (item) => item.title,
  type: (item) => contentTypeLabel(item.contentType),
  year: (item) => (item.releaseDate ? new Date(item.releaseDate) : null),
  voted: (item) => item.ratingsCount,
  score: (item) => item.userRating,
};

export default function ScoreboardTable({ ranked }: { ranked: ScoreboardEntry[] }) {
  // Defaults to catalog (episode) order, newest first — this is a score
  // reference, not a leaderboard, so the natural read order is "most
  // recently watched."
  const { sorted, sortKey, direction, toggleSort } = useTableSort(ranked, sortAccessors, "catalog", "desc");
  const [detailItem, setDetailItem] = useState<ScoreboardEntry | null>(null);

  return (
    <div className="mt-6 border border-black/10 rounded-sm">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-black/10 bg-black/5 hover:bg-black/5">
            <SortableHead
              label="#"
              sortKey="catalog"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className={cn("w-14", cellBorder, mobileHidden)}
              buttonClassName={headButton}
            />
            <SortableHead
              label="Title"
              sortKey="title"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className={cellBorder}
              buttonClassName={headButton}
            />
            <SortableHead
              label="Type"
              sortKey="type"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className={cn("w-28", cellBorder, mobileHidden)}
              buttonClassName={headButton}
            />
            <SortableHead
              label="Year"
              sortKey="year"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className={cn("w-16", cellBorder, mobileHidden)}
              buttonClassName={headButton}
            />
            <SortableHead
              label="Voted"
              sortKey="voted"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className={cn("w-20", cellBorder, mobileHidden)}
              buttonClassName={cn(headButton, "justify-end")}
            />
            <SortableHead
              label="Score"
              sortKey="score"
              activeKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className="w-20"
              buttonClassName={cn(headButton, "justify-end")}
            />
            <TableHead className="w-10 p-0 sm:hidden">
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
            const percent = nfcPercent(item.userRating);
            return (
              <TableRow
                key={item.id}
                className="border-black/10 even:bg-black/[0.02] hover:bg-black/5"
              >
                <TableCell className={cn("py-1.5 font-mono text-xs text-black/40", cellBorder, mobileHidden)}>
                  {item.catalogNumber ?? "—"}
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
                <TableCell className={cn("py-1.5 text-xs text-black/60", cellBorder, mobileHidden)}>
                  {contentTypeLabel(item.contentType)}
                </TableCell>
                <TableCell className={cn("py-1.5 font-mono text-xs text-black/60", cellBorder, mobileHidden)}>
                  {year ?? "—"}
                </TableCell>
                <TableCell className={cn("py-1.5 font-mono text-xs text-black/60 text-right", cellBorder, mobileHidden)}>
                  {item.ratingsCount}
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
                <TableCell className="py-1.5 text-center sm:hidden">
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="inline-flex items-center justify-center rounded-[2px] p-1 text-black/50 hover:bg-black/5 hover:text-black"
                    aria-label={`View details for ${item.title}`}
                  >
                    <EyeIcon className="h-4 w-4" weight="fill" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ScoreboardDetailSheet item={detailItem} onOpenChange={(open) => !open && setDetailItem(null)} />
    </div>
  );
}

// Full row detail, surfaced on mobile behind the eye icon since the compact
// table only shows title + score there.
function ScoreboardDetailSheet({
  item,
  onOpenChange,
}: {
  item: ScoreboardEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const percent = item ? nfcPercent(item.userRating) : null;
  const year = item?.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;

  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle>{item.title}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4 pb-6">
              <div className="flex items-center gap-3">
                {item.posterImage && (
                  <CldImage
                    src={item.posterImage}
                    version={item.posterVersion ?? undefined}
                    alt=""
                    width={48}
                    height={64}
                    className="h-16 w-12 shrink-0 rounded-[2px] object-cover"
                    sizes="48px"
                  />
                )}
                <span
                  className={cn(
                    "inline-block w-fit rounded-[2px] px-2 py-1 font-mono text-sm font-semibold text-white",
                    scoreBadgeClass(item.userRating),
                  )}
                >
                  {percent === null ? "N/A" : `${percent}%`} NFC score
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-4 border-t border-black/10 pt-4 font-mono text-xs">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-black/40">Catalog</dt>
                  <dd className="text-black/80">
                    {item.catalogNumber !== null ? `NFC #${item.catalogNumber}` : "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-black/40">Type</dt>
                  <dd className="text-black/80">{contentTypeLabel(item.contentType)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-black/40">Year</dt>
                  <dd className="text-black/80">{year ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-black/40">Voted</dt>
                  <dd className="text-black/80">{item.ratingsCount}</dd>
                </div>
              </dl>
              <Link
                href={contentPath(item)}
                onClick={() => onOpenChange(false)}
                className="text-sm font-medium underline underline-offset-2"
              >
                View full page
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

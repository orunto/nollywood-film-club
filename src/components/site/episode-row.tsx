"use client";
import { Link } from "react-router";
import {
  PlayIcon,
  MicrophoneStageIcon,
  BroadcastIcon,
  YoutubeLogoIcon,
  ArrowSquareOutIcon,
} from "@phosphor-icons/react";
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
import { contentPath, episodeLabel } from "../../lib/utils";
import type { Discussion } from "../../repositories/public-read";

interface EpisodeRowProps {
  discussion: Discussion;
}

export default function EpisodeRow({ discussion }: EpisodeRowProps) {
  const hasLink = Boolean(
    discussion.spaceUrl || (discussion.podcastLinks && discussion.podcastLinks.length > 0),
  );
  const date = discussion.discussionDate || discussion.content?.releaseDate;
  const label = episodeLabel(discussion.episodeNumber, discussion.title);

  const playButton = (
    <button
      type="button"
      disabled={!hasLink}
      aria-label={hasLink ? `Listen to ${label}` : `${label} — recording coming soon`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 text-black transition-colors group-hover:border-black disabled:cursor-not-allowed disabled:opacity-30 disabled:group-hover:border-black/15"
    >
      <PlayIcon weight="fill" className="h-4 w-4 translate-x-[1px]" />
    </button>
  );

  const row = (
    <div className="group flex items-center gap-4 rounded-sm px-2 py-4 -mx-2 transition-colors hover:bg-black/[0.03]">
      {hasLink ? (
        <AlertDialogTrigger asChild>{playButton}</AlertDialogTrigger>
      ) : (
        playButton
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {discussion.content && (
          <Link
            to={contentPath(discussion.content)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-black/50 hover:text-black hover:underline"
          >
            {discussion.content.title}
          </Link>
        )}
      </div>
      {date && (
        <span className="hidden shrink-0 font-mono text-xs text-black/40 sm:block">
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      )}
    </div>
  );

  if (!hasLink) return row;

  return (
    <AlertDialog>
      {row}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Listen to {label}</AlertDialogTitle>
          <AlertDialogDescription>
            Pick your platform. The opinions are the same on all of them.
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
                <MicrophoneStageIcon className="w-5 h-5" />
                <span className="font-medium">Twitter Space Link</span>
              </div>
              <ArrowSquareOutIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
          {discussion.podcastLinks?.map((link, idx) => {
            const isSpotify = link.includes("spotify");
            const isYoutube = link.includes("youtube");

            return (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {isSpotify ? (
                    <BroadcastIcon className="w-5 h-5 text-[#1DB954]" />
                  ) : isYoutube ? (
                    <YoutubeLogoIcon className="w-5 h-5 text-[#FF0000]" />
                  ) : (
                    <BroadcastIcon className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {isSpotify ? "Spotify Link" : isYoutube ? "Youtube Music Link" : "Podcast Link"}
                  </span>
                </div>
                <ArrowSquareOutIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/admin.catalog";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { ArrowSquareOutIcon, CaretUpDownIcon, EyeIcon, ImageIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, StarIcon, TrashIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { SortableHead, useTableSort, type SortAccessors } from "../../components/ui/table-sort";
import { contentTypeLabel, detectStreamingPlatform, episodeLabel, viewingCategoryLabel, VIEWING_CATEGORIES, type ViewingCategory } from "../../lib/utils";
import { posterUrl } from "../../lib/media";
import type { CastMember } from "../../db/schema";
import { ContentPreview, type PreviewItem } from "../../components/admin/content-preview";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminSearchInput,
  LoadingRows,
  adminBadgeClass,
  adminOutlineBadgeClass,
  inputClass,
  jsonResponse,
} from "../../components/admin/admin-ui";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface JustWatchResult {
  id: string;
  title: string;
  contentType: "movie" | "tv_show";
  year: number | null;
  releaseDate: string | null;
  runtime: number | null;
  rating: string | null;
  synopsis: string | null;
  genre: string;
  posterUrl: string | null;
  trailerUrl: string | null;
  castMembers: CastMember[] | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
  streamingUrl: string | null;
}

interface DiscussionOption {
  id: string;
  episodeNumber: number | null;
  title: string;
  contentId: string | null;
}

interface ContentRow {
  id: string;
  title: string;
  contentType: "movie" | "tv_show" | "short_film";
  runtime: number | null;
  releaseDate: string | null;
  rating: string | null;
  synopsis: string | null;
  genre: string[];
  posterImage: string | null;
  posterVersion: number | null;
  trailerUrl: string | null;
  streamingUrl: string | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
  viewingCategory: string | null;
  castMembers: CastMember[];
  isMovieOfTheWeek: boolean;
  catalogNumber: number | null;
}

const emptyDiscussionDraft = {
  episodeNumber: "",
  title: "",
  spaceUrl: "",
  discussionDate: "",
  podcastLinks: "",
};

const fieldClass = "flex flex-col gap-2";
const badgeClass = "rounded-sm border border-black bg-transparent text-xs text-black";

const RATING_OPTIONS = ["G", "PG", "PG-13", "13", "R", "16", "NC-17", "18+", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"];

const STREAMING_PLATFORM_OPTIONS = [
  { value: "netflix", label: "Netflix" },
  { value: "prime_video", label: "Prime Video" },
  { value: "youtube", label: "YouTube" },
  { value: "disney_plus", label: "Disney Plus" },
  { value: "hulu", label: "Hulu" },
  { value: "hbo_max", label: "HBO Max" },
  { value: "apple_tv", label: "Apple TV" },
  { value: "paramount_plus", label: "Paramount Plus" },
  { value: "peacock", label: "Peacock" },
  { value: "other", label: "Other" },
];

const toISODate = (value: Date | string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
};

interface ContentRowInput {
  id: string;
  title: string;
  contentType: "movie" | "tv_show" | "short_film";
  runtime: number | null;
  releaseDate: Date | string | null;
  rating: string | null;
  synopsis: string | null;
  genre: string[];
  legacyPosterImage: string | null;
  legacyPosterVersion: number | null;
  posterObjectKey?: string | null;
  trailerUrl: string | null;
  streamingUrl: string | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
  viewingCategory: string | null;
  castMembers: CastMember[] | null;
  isMovieOfTheWeek: boolean;
  catalogNumber: number | null;
}

// Maps both loader rows (dates as Date) and API rows (dates as ISO strings)
// to the client ContentRow shape.
const mapRow = (row: ContentRowInput): ContentRow => ({
  id: row.id,
  title: row.title,
  contentType: row.contentType,
  runtime: row.runtime,
  releaseDate: toISODate(row.releaseDate),
  rating: row.rating,
  synopsis: row.synopsis,
  genre: row.genre ?? [],
  posterImage: row.posterObjectKey ?? row.legacyPosterImage,
  posterVersion: row.posterObjectKey ? null : row.legacyPosterVersion,
  trailerUrl: row.trailerUrl,
  streamingUrl: row.streamingUrl,
  streamingPlatform: row.streamingPlatform,
  otherPlatform: row.otherPlatform,
  viewingCategory: row.viewingCategory,
  castMembers: row.castMembers ?? [],
  isMovieOfTheWeek: row.isMovieOfTheWeek,
  catalogNumber: row.catalogNumber,
});

const mapDiscussion = (discussion: DiscussionOption): DiscussionOption => ({
  id: discussion.id,
  episodeNumber: discussion.episodeNumber,
  title: discussion.title,
  contentId: discussion.contentId,
});

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  const [content, discussions] = await Promise.all([
    services.db.adminContent.list(),
    services.db.adminDiscussions.list(),
  ]);

  return {
    content: content.map((row: ContentRowInput) => mapRow(row)),
    discussions: discussions.map((discussion: DiscussionOption) => mapDiscussion(discussion)),
  };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export default function AdminCatalogRoute() {
  const { content: initialContent, discussions: initialDiscussions } = useLoaderData<typeof loader>();

  const [movies, setMovies] = useState<ContentRow[]>(initialContent);
  const [discussions, setDiscussions] = useState<DiscussionOption[]>(initialDiscussions);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv_show" | "short_film">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMovie, setEditingMovie] = useState<ContentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [previewMovie, setPreviewMovie] = useState<PreviewItem | null>(null);
  const [jwQuery, setJwQuery] = useState("");
  const [jwResults, setJwResults] = useState<JustWatchResult[]>([]);
  const [isSearchingJw, setIsSearchingJw] = useState(false);
  const [importedPosterUrl, setImportedPosterUrl] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [linkedDiscussionIds, setLinkedDiscussionIds] = useState<string[]>([]);
  const [addingNewDiscussion, setAddingNewDiscussion] = useState(false);
  const [discussionPickerOpen, setDiscussionPickerOpen] = useState(false);
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [discussionDraft, setDiscussionDraft] = useState(emptyDiscussionDraft);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const [castMembers, setCastMembers] = useState<CastMember[] | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    contentType: "movie" as "movie" | "tv_show" | "short_film",
    runtime: "",
    releaseDate: "",
    rating: "",
    synopsis: "",
    genre: "",
    posterImage: "",
    posterVersion: null as number | null,
    trailerUrl: "",
    streamingUrl: "",
    streamingPlatform: "",
    otherPlatform: "",
    viewingCategory: "" as ViewingCategory | "",
    isMovieOfTheWeek: false,
  });

  useEffect(() => {
    setMovies(initialContent);
  }, [initialContent]);

  useEffect(() => {
    setDiscussions(initialDiscussions);
  }, [initialDiscussions]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const [moviesResponse, discussionsResponse] = await Promise.all([
        fetch("/api/admin/movies"),
        fetch("/api/admin/discussions"),
      ]);
      const data = await jsonResponse<ContentRowInput[]>(moviesResponse);
      const discussionsData = await jsonResponse<DiscussionOption[]>(discussionsResponse);
      if (data.success) {
        setMovies((data.data as ContentRowInput[]).map((row) => mapRow(row)));
      } else {
        toast.error("Failed to load content");
      }
      if (discussionsData.success) {
        setDiscussions((discussionsData.data as DiscussionOption[]).map(mapDiscussion));
      }
    } catch {
      toast.error("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const searchJustWatch = async () => {
    const q = jwQuery.trim();
    if (!q) return;
    setIsSearchingJw(true);
    try {
      const response = await fetch(`/api/admin/justwatch?q=${encodeURIComponent(q)}`);
      const data = await jsonResponse<JustWatchResult[]>(response);
      if (data.success) {
        setJwResults(data.data ?? []);
        if ((data.data?.length ?? 0) === 0) {
          toast.info("No JustWatch results found");
        }
      } else {
        toast.error(data.error || "JustWatch search failed");
      }
    } catch {
      toast.error("JustWatch search failed. Please try again.");
    } finally {
      setIsSearchingJw(false);
    }
  };

  // Store the JustWatch poster through the media pipeline so the content row
  // references a stable /media/ URL rather than a third-party hotlink.
  const importPosterUrl = async (url: string, catalog: string) => {
    setIsUploadingPoster(true);
    try {
      const response = await fetch("/api/admin/justwatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, catalog }),
      });
      const result = await jsonResponse<{ url: string }>(response);
      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          posterImage: result.data?.url ?? "",
          posterVersion: null,
        }));
        setImportedPosterUrl(null);
        toast.success("Poster imported");
      } else {
        toast.error(result.error || "Poster import failed — add it via the JustWatch poster link");
      }
    } catch {
      toast.error("Poster import failed — add it via the JustWatch poster link");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const importFromJustWatch = async (result: JustWatchResult) => {
    setFormData((prev) => ({
      ...prev,
      title: result.title,
      contentType: result.contentType,
      runtime: result.runtime?.toString() ?? "",
      releaseDate: result.releaseDate ?? "",
      rating: result.rating ?? "",
      synopsis: result.synopsis ?? "",
      genre: result.genre,
      trailerUrl: result.trailerUrl ?? "",
      streamingUrl: result.streamingUrl ?? "",
      streamingPlatform: result.streamingPlatform ?? "",
      otherPlatform: result.otherPlatform ?? "",
      viewingCategory: result.streamingUrl ? "streaming" : prev.viewingCategory,
    }));
    setCastMembers(result.castMembers);
    setJwResults([]);
    toast.success(`Imported "${result.title}" from JustWatch`);

    if (result.posterUrl) {
      setImportedPosterUrl(result.posterUrl);
      await importPosterUrl(result.posterUrl, `${result.title}_${result.year ?? ""}`);
    }
  };

  const handleStreamingUrlChange = (streamingUrl: string) => {
    const platform = detectStreamingPlatform(streamingUrl);
    setFormData((prev) => ({
      ...prev,
      streamingUrl,
      ...(platform
        ? {
            streamingPlatform: platform,
            viewingCategory: "streaming" as ViewingCategory,
          }
        : {}),
    }));
  };

  const syncDiscussionLink = async (contentId: string) => {
    const previous = editingMovie
      ? discussions.filter((d) => d.contentId === editingMovie.id).map((d) => d.id)
      : [];
    const removed = previous.filter((id) => !linkedDiscussionIds.includes(id));
    const added = linkedDiscussionIds.filter((id) => !previous.includes(id));
    if (removed.length === 0 && added.length === 0) return;

    const patch = (id: string, body: { contentId: string | null }) =>
      fetch(`/api/admin/discussions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((response) => jsonResponse(response));

    try {
      const results = await Promise.all([
        ...removed.map((id) => patch(id, { contentId: null })),
        ...added.map((id) => patch(id, { contentId })),
      ]);
      const failed = results.find((result) => !result.success);
      if (failed) {
        toast.error(failed.error || "Content saved, but linking the discussions failed");
      }
    } catch {
      toast.error("Content saved, but linking the discussions failed");
    }
  };

  const createLinkedDiscussion = async (contentId: string): Promise<boolean> => {
    if (!addingNewDiscussion) return true;
    try {
      const response = await fetch("/api/admin/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: discussionDraft.title.trim() || formData.title,
          contentId,
          spaceUrl: discussionDraft.spaceUrl.trim() || null,
          episodeNumber: discussionDraft.episodeNumber
            ? parseInt(discussionDraft.episodeNumber, 10)
            : null,
          discussionDate: discussionDraft.discussionDate || null,
          podcastLinks: discussionDraft.podcastLinks
            .split(/[\n,]/)
            .map((link) => link.trim())
            .filter(Boolean),
        }),
      });
      const result = await jsonResponse(response);
      if (result.success) return true;

      if (result.field === "episodeNumber") {
        setEpisodeError(result.error ?? null);
        return false;
      }
      toast.error(result.error || "Content saved, but creating the discussion failed");
    } catch {
      toast.error("Content saved, but creating the discussion failed");
    }
    return true;
  };

  const addCastMember = (role: CastMember["role"]) => {
    setCastMembers((prev) => [...(prev ?? []), { role, name: "", characterName: null }]);
  };

  const updateCastMember = (index: number, patch: Partial<CastMember>) => {
    setCastMembers((prev) => (prev ?? []).map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const removeCastMember = (index: number) => {
    setCastMembers((prev) => (prev ?? []).filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEpisodeError(null);
    try {
      const movieData = {
        ...formData,
        runtime: formData.runtime ? parseInt(formData.runtime, 10) : null,
        releaseDate: formData.releaseDate || null,
        genre: formData.genre ? formData.genre.split(",").map((g) => g.trim()) : [],
        castMembers,
      };

      const url = editingMovie ? `/api/admin/movies/${editingMovie.id}` : "/api/admin/movies";
      const method = editingMovie ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movieData),
      });

      const result = await jsonResponse<ContentRowInput>(response);
      if (result.success) {
        const savedContentId: string | undefined = result.data?.id ?? editingMovie?.id;
        const wasAdding = !editingMovie;
        if (savedContentId) {
          await syncDiscussionLink(savedContentId);
          const discussionSaved = await createLinkedDiscussion(savedContentId);
          if (!discussionSaved) {
            await fetchMovies();
            if (wasAdding && result.data) setEditingMovie(mapRow(result.data));
            toast.error("Content saved — fix the episode number to create the discussion");
            return;
          }
        }
        await fetchMovies();
        toast.success(`Content ${wasAdding ? "added" : "updated"} successfully`);
        setIsFormOpen(false);
        setEditingMovie(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingMovie ? "update" : "add"} content`);
      }
    } catch {
      toast.error(`Failed to ${editingMovie ? "update" : "add"} content. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingMovie(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (movie: ContentRow) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      contentType: movie.contentType,
      runtime: movie.runtime?.toString() || "",
      releaseDate: movie.releaseDate || "",
      rating: movie.rating || "",
      synopsis: movie.synopsis || "",
      genre: movie.genre?.join(", ") || "",
      posterImage: movie.posterImage || "",
      posterVersion: movie.posterVersion,
      trailerUrl: movie.trailerUrl || "",
      streamingUrl: movie.streamingUrl || "",
      streamingPlatform: movie.streamingPlatform || "",
      otherPlatform: movie.otherPlatform || "",
      viewingCategory: (movie.viewingCategory as ViewingCategory | "") || "",
      isMovieOfTheWeek: movie.isMovieOfTheWeek,
    });
    setCastMembers(movie.castMembers);
    setJwQuery("");
    setJwResults([]);
    setImportedPosterUrl(null);
    setLinkedDiscussionIds(
      discussions.filter((d) => d.contentId === movie.id).map((d) => d.id),
    );
    setAddingNewDiscussion(false);
    setDiscussionDraft(emptyDiscussionDraft);
    setDiscussionPickerOpen(false);
    setDiscussionSearch("");
    setEpisodeError(null);
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/movies/${isDeleting}`, { method: "DELETE" });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchMovies();
        toast.success("Content deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete content");
      }
    } catch {
      toast.error("Failed to delete content. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleMovieOfTheWeek = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/movies/${id}/movie-of-the-week`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMovieOfTheWeek: !currentValue }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchMovies();
        toast.success(currentValue ? "Removed from Movie of the Week" : "Set as Movie of the Week");
      } else {
        toast.error(result.error || "Failed to update Movie of the Week");
      }
    } catch {
      toast.error("Failed to update Movie of the Week. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      contentType: "movie",
      runtime: "",
      releaseDate: "",
      rating: "",
      synopsis: "",
      genre: "",
      posterImage: "",
      posterVersion: null,
      trailerUrl: "",
      streamingUrl: "",
      streamingPlatform: "",
      otherPlatform: "",
      viewingCategory: "",
      isMovieOfTheWeek: false,
    });
    setCastMembers(null);
    setJwQuery("");
    setJwResults([]);
    setImportedPosterUrl(null);
    setLinkedDiscussionIds([]);
    setAddingNewDiscussion(false);
    setDiscussionDraft(emptyDiscussionDraft);
    setDiscussionPickerOpen(false);
    setDiscussionSearch("");
    setEpisodeError(null);
  };

  const filteredMovies = movies.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesType = typeFilter === "all" || m.contentType === typeFilter;
    return matchesSearch && matchesType;
  });
  const movieBeingDeleted = movies.find((m) => m.id === isDeleting);
  const isFiltered = searchQuery.trim() !== "" || typeFilter !== "all";
  const sortAccessors: SortAccessors<ContentRow> = {
    title: (m) => m.title,
    type: (m) => m.contentType,
    rating: (m) => m.rating,
    runtime: (m) => m.runtime,
    released: (m) => (m.releaseDate ? new Date(m.releaseDate) : null),
  };
  const { sorted: sortedMovies, sortKey, direction, toggleSort } = useTableSort(filteredMovies, sortAccessors);

  const filteredDiscussions = discussions.filter((d) => {
    const q = discussionSearch.trim().toLowerCase();
    if (!q) return true;
    return `${d.episodeNumber ?? ""} ${d.title}`.toLowerCase().includes(q);
  });
  const linkedCount = linkedDiscussionIds.length;

return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Content Management"
        description="Manage movies, TV shows and short films. A content item only becomes a catalogue entry once a discussion episode is linked to it."
      />

      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by title…" />
        <Select value={typeFilter} onValueChange={(value: "all" | "movie" | "tv_show" | "short_film") => setTypeFilter(value)}>
          <SelectTrigger className={`w-40 ${inputClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tv_show">TV Shows</SelectItem>
            <SelectItem value="short_film">Short Films</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          className="ml-auto rounded-sm bg-black text-white shadow-none hover:bg-black/80"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filteredMovies.length === 0 ? (
        <AdminEmptyState
          filtered={isFiltered}
          title="No content yet"
          message={
            isFiltered
              ? "No content matches your search/filter."
              : 'No content yet. Click "Add Content" to create one.'
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="Title" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Type" sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Rating" sortKey="rating" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Runtime" sortKey="runtime" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Released" sortKey="released" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMovies.map((movie) => (
                <TableRow key={movie.id} className="border-black/10 hover:bg-black/5 group">
                  <TableCell className="whitespace-normal font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {movie.title}
                      {movie.isMovieOfTheWeek && (
                        <Badge className={adminBadgeClass}>
                          <StarIcon weight="fill" className="mr-1 h-3 w-3" />
                          MOTW
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge className={adminOutlineBadgeClass}>
                        {contentTypeLabel(movie.contentType)}
                      </Badge>
                      {movie.viewingCategory && (
                        <Badge className={adminOutlineBadgeClass}>
                          {viewingCategoryLabel(movie.viewingCategory)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-black/60">{movie.rating || "—"}</TableCell>
                  <TableCell className="text-black/60">
                    {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "—"}
                  </TableCell>
                  <TableCell className="text-black/60">
                    {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:bg-black/10 hover:text-black"
                        onClick={() => toggleMovieOfTheWeek(movie.id, movie.isMovieOfTheWeek)}
                        title={movie.isMovieOfTheWeek ? "Remove from Movie of the Week" : "Set as Movie of the Week"}
                      >
                        <StarIcon weight={movie.isMovieOfTheWeek ? "fill" : "regular"} className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:bg-black/10 hover:text-black"
                        onClick={() => setPreviewMovie(movie)}
                        title="Preview the live page"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => handleEdit(movie)}>
                        <PencilSimpleIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => setIsDeleting(movie.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminCard>
      )}

      <ContentPreview
        key={previewMovie?.id ?? "none"}
        movie={previewMovie}
        onOpenChange={(open) => !open && setPreviewMovie(null)}
      />

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingMovie ? "Edit Content" : "Add New Content"}</SheetTitle>
            <SheetDescription>
              {editingMovie ? "Update movie/TV show information" : "Add a new movie or TV show to the database"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2 rounded-sm border border-black/10 p-3">
                <Label htmlFor="jwSearch">Import from JustWatch</Label>
                <div className="flex gap-2">
                  <Input
                    id="jwSearch"
                    className={inputClass}
                    value={jwQuery}
                    onChange={(e) => setJwQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchJustWatch();
                      }
                    }}
                    placeholder="Search movies & TV shows…"
                  />
                  <Button
                    type="button"
                    onClick={searchJustWatch}
                    disabled={isSearchingJw || !jwQuery.trim()}
                    className="shrink-0 rounded-sm bg-black text-white shadow-none hover:bg-black/80"
                  >
                    <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                    {isSearchingJw ? "Searching…" : "Search"}
                  </Button>
                </div>
                {jwResults.length > 0 && (
                  <div className="max-h-64 divide-y divide-black/10 overflow-y-auto rounded-sm border border-black/10">
                    {jwResults.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => importFromJustWatch(result)}
                        className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-black/5"
                      >
                        {result.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.posterUrl}
                            alt=""
                            className="h-12 w-8 shrink-0 rounded-sm border border-black/10 object-cover"
                          />
                        ) : (
                          <div className="h-12 w-8 shrink-0 rounded-sm border border-black/10 bg-black/5" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{result.title}</p>
                          <p className="truncate text-xs font-light text-black/60">
                            {result.contentType === "movie" ? "Movie" : "TV Show"}
                            {result.year && <> · {result.year}</>}
                            {(result.otherPlatform || result.streamingPlatform) && (
                              <> · {result.otherPlatform || result.streamingPlatform?.replace(/_/g, " ")}</>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs font-light text-black/60">
                  Selecting a result fills the form below. Review before saving.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    className={inputClass}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select
                    value={formData.contentType}
                    onValueChange={(value: "movie" | "tv_show" | "short_film") => setFormData({ ...formData, contentType: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="tv_show">TV Show</SelectItem>
                      <SelectItem value="short_film">Short Film</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={fieldClass}>
                <Label>S/N (Catalog Number)</Label>
                <p className="text-sm text-black/60">
                  {editingMovie?.catalogNumber != null
                    ? `#${editingMovie.catalogNumber} — derived from the lowest linked episode number below`
                    : "Assigned automatically once a discussion is linked below"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="runtime">Runtime (minutes)</Label>
                  <Input
                    id="runtime"
                    type="number"
                    className={inputClass}
                    value={formData.runtime}
                    onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    className={inputClass}
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                  />
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="rating">Rating</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(value) => setFormData({ ...formData, rating: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATING_OPTIONS.map((rating) => (
                        <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={fieldClass}>
                <Label htmlFor="genre">Genres (comma-separated)</Label>
                <Input
                  id="genre"
                  className={inputClass}
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Comedy, Drama, Action"
                />
              </div>

              <div className={fieldClass}>
                <Label htmlFor="synopsis">Synopsis</Label>
                <Textarea
                  id="synopsis"
                  className={inputClass}
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  rows={4}
                />
              </div>

              <div className={fieldClass}>
                <Label>Poster Image</Label>
                <div className="flex items-center gap-3">
                  {formData.posterImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${formData.posterImage}-${formData.posterVersion ?? ""}`}
                      src={posterUrl(formData.posterImage, { version: formData.posterVersion })}
                      alt=""
                      className="h-[72px] w-12 shrink-0 rounded-sm border border-black/10 bg-black/5 object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-black/20 bg-black/5">
                      <ImageIcon className="h-4 w-4 text-black/30" />
                    </div>
                  )}
                  <PosterUploadButton
                    catalog={`${formData.title}_${formData.releaseDate.slice(0, 4)}`}
                    onUploaded={(url) =>
                      setFormData((prev) => ({ ...prev, posterImage: url, posterVersion: null }))
                    }
                  />
                  {formData.posterImage ? (
                    <>
                      <span className="truncate text-xs font-light text-black/60">{formData.posterImage}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-black/60 hover:bg-black/10 hover:text-black"
                        onClick={() => setFormData((prev) => ({ ...prev, posterImage: "", posterVersion: null }))}
                        title="Remove poster"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs font-light text-black/50">No poster uploaded yet</span>
                  )}
                </div>
                {isUploadingPoster && (
                  <p className="text-xs font-light text-black/60">Importing JustWatch poster…</p>
                )}
                {importedPosterUrl && !isUploadingPoster && (
                  <p className="text-xs font-light text-black/60">
                    <a
                      href={importedPosterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline hover:text-black"
                    >
                      JustWatch poster
                      <ArrowSquareOutIcon className="h-3 w-3" />
                    </a>
                    {" "}— auto-import failed; download it and use the Upload button.
                  </p>
                )}
              </div>

              <div className={fieldClass}>
                <Label htmlFor="trailerUrl">Trailer URL (YouTube embed)</Label>
                <Input
                  id="trailerUrl"
                  className={inputClass}
                  value={formData.trailerUrl}
                  onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="streamingPlatform">Streaming Platform</Label>
                  <Select
                    value={formData.streamingPlatform}
                    onValueChange={(value) => setFormData({ ...formData, streamingPlatform: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAMING_PLATFORM_OPTIONS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="streamingUrl">Streaming URL</Label>
                  <Input
                    id="streamingUrl"
                    className={inputClass}
                    value={formData.streamingUrl}
                    onChange={(e) => handleStreamingUrlChange(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className={fieldClass}>
                <Label htmlFor="viewingCategory">Viewing Category</Label>
                <Select
                  value={formData.viewingCategory}
                  onValueChange={(value) =>
                    setFormData({ ...formData, viewingCategory: value as ViewingCategory })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select viewing category" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEWING_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.streamingPlatform === "other" && (
                <div className={fieldClass}>
                  <Label htmlFor="otherPlatform">Other Platform Name</Label>
                  <Input
                    id="otherPlatform"
                    className={inputClass}
                    value={formData.otherPlatform}
                    onChange={(e) => setFormData({ ...formData, otherPlatform: e.target.value })}
                    placeholder="Platform name"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Cast &amp; Crew</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-sm border-black/20 font-normal shadow-none"
                      onClick={() => addCastMember("director")}
                    >
                      <PlusIcon className="h-3 w-3" />
                      Director
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-sm border-black/20 font-normal shadow-none"
                      onClick={() => addCastMember("actor")}
                    >
                      <PlusIcon className="h-3 w-3" />
                      Actor
                    </Button>
                  </div>
                </div>

                {!castMembers || castMembers.length === 0 ? (
                  <p className="text-xs font-light text-black/60">
                    No cast on record. Import from JustWatch above, or add them by hand.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {castMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge className={`${badgeClass} w-16 shrink-0 justify-center`}>
                          {member.role === "director" ? "Director" : "Actor"}
                        </Badge>
                        <Input
                          className={`${inputClass} flex-1`}
                          value={member.name}
                          onChange={(e) => updateCastMember(index, { name: e.target.value })}
                          placeholder="Name"
                          aria-label={`${member.role === "director" ? "Director" : "Actor"} name`}
                        />
                        {member.role === "actor" && (
                          <Input
                            className={`${inputClass} flex-1`}
                            value={member.characterName ?? ""}
                            onChange={(e) => updateCastMember(index, { characterName: e.target.value })}
                            placeholder="Character (optional)"
                            aria-label="Character name"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-black/60 hover:bg-black/10 hover:text-black"
                          onClick={() => removeCastMember(index)}
                          aria-label={`Remove ${member.name || "this entry"}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs font-light text-black/60">
                      Entries with no name are dropped when you save.
                    </p>
                  </div>
                )}
              </div>

              <div className={fieldClass}>
                <Label>Linked Discussion Episodes</Label>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={discussionPickerOpen}
                  onClick={() => setDiscussionPickerOpen((open) => !open)}
                  className={`w-full justify-between font-normal ${inputClass} ${linkedCount > 0 ? "" : "text-black/50"}`}
                >
                  <span className="truncate">
                    {linkedCount === 0
                      ? "Search discussion episodes…"
                      : `${linkedCount} episode${linkedCount === 1 ? "" : "s"} linked`}
                  </span>
                  <CaretUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {discussionPickerOpen && (
                  <div className="overflow-hidden rounded-sm border border-black/20">
                    <Input
                      value={discussionSearch}
                      onChange={(e) => setDiscussionSearch(e.target.value)}
                      placeholder="Search by title or episode #…"
                      className={`rounded-none border-0 border-b border-black/10 shadow-none focus-visible:ring-0 ${inputClass}`}
                    />
                    <div className="max-h-56 divide-y divide-black/10 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingNewDiscussion(true);
                          setEpisodeError(null);
                          setDiscussionDraft((prev) => ({
                            ...prev,
                            title: prev.title || formData.title,
                          }));
                          setDiscussionPickerOpen(false);
                        }}
                        className="flex w-full items-center gap-2 p-2 text-left text-sm transition-colors hover:bg-black/5"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create new discussion
                      </button>
                      {filteredDiscussions.map((discussion) => {
                        const isLinked = linkedDiscussionIds.includes(discussion.id);
                        return (
                          <label
                            key={discussion.id}
                            className="flex cursor-pointer items-center gap-2 p-2 transition-colors hover:bg-black/5"
                          >
                            <Checkbox
                              checked={isLinked}
                              onCheckedChange={() =>
                                setLinkedDiscussionIds((prev) =>
                                  isLinked
                                    ? prev.filter((id) => id !== discussion.id)
                                    : [...prev, discussion.id],
                                )
                              }
                            />
                            <span className="truncate text-sm">
                              {episodeLabel(discussion.episodeNumber, discussion.title)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {linkedCount > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {linkedDiscussionIds.map((id) => {
                      const linked = discussions.find((d) => d.id === id);
                      if (!linked) return null;
                      return (
                        <Badge key={id} className="gap-1 rounded-sm bg-black pr-1 text-xs font-normal text-white">
                          {episodeLabel(linked.episodeNumber, linked.title)}
                          <button
                            type="button"
                            aria-label={`Unlink ${linked.title}`}
                            onClick={() =>
                              setLinkedDiscussionIds((prev) => prev.filter((x) => x !== id))
                            }
                            className="cursor-pointer hover:opacity-60"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs font-light text-black/60">
                  A film can be discussed more than once. The lowest episode number
                  linked here becomes its catalogue number.
                </p>
              </div>

              {addingNewDiscussion && (
                <div className="flex flex-col gap-4 rounded-sm border border-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">New discussion</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Discard this new discussion"
                      className="text-black/60 hover:bg-black/10 hover:text-black"
                      onClick={() => {
                        setAddingNewDiscussion(false);
                        setDiscussionDraft(emptyDiscussionDraft);
                        setEpisodeError(null);
                      }}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-4">
                    <div className={fieldClass}>
                      <Label htmlFor="episodeNumber">Episode #</Label>
                      <Input
                        id="episodeNumber"
                        type="number"
                        className={inputClass}
                        value={discussionDraft.episodeNumber}
                        onChange={(e) => {
                          setEpisodeError(null);
                          setDiscussionDraft({ ...discussionDraft, episodeNumber: e.target.value });
                        }}
                        placeholder="13"
                        aria-invalid={Boolean(episodeError)}
                      />
                    </div>
                    <div className={fieldClass}>
                      <Label htmlFor="discussionTitle">Discussion Title</Label>
                      <Input
                        id="discussionTitle"
                        className={inputClass}
                        value={discussionDraft.title}
                        onChange={(e) => setDiscussionDraft({ ...discussionDraft, title: e.target.value })}
                        placeholder={formData.title || "Defaults to the film title"}
                      />
                    </div>
                  </div>
                  {episodeError && (
                    <p className="-mt-2 text-xs text-red-700">{episodeError}</p>
                  )}

                  <div className={fieldClass}>
                    <Label htmlFor="spaceUrl">Space URL</Label>
                    <Input
                      id="spaceUrl"
                      className={inputClass}
                      value={discussionDraft.spaceUrl}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, spaceUrl: e.target.value })}
                      placeholder="https://x.com/i/spaces/…"
                    />
                  </div>

                  <div className={fieldClass}>
                    <Label htmlFor="discussionDate">Discussion Date</Label>
                    <Input
                      id="discussionDate"
                      type="date"
                      className={inputClass}
                      value={discussionDraft.discussionDate}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, discussionDate: e.target.value })}
                    />
                  </div>

                  <div className={fieldClass}>
                    <Label htmlFor="podcastLinks">Podcast Links</Label>
                    <Textarea
                      id="podcastLinks"
                      className={inputClass}
                      rows={2}
                      value={discussionDraft.podcastLinks}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, podcastLinks: e.target.value })}
                      placeholder="One per line, or comma separated"
                    />
                    <p className="text-xs font-light text-black/60">
                      Adding a podcast link lets people rate the film straight away, instead of waiting 24 hours.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isMovieOfTheWeek"
                  checked={formData.isMovieOfTheWeek}
                  onCheckedChange={(checked) => setFormData({ ...formData, isMovieOfTheWeek: checked === true })}
                />
                <Label htmlFor="isMovieOfTheWeek">Movie of the Week</Label>
              </div>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button
                type="button"
                variant="outline"
                className="rounded-sm border-black text-black shadow-none hover:bg-black hover:text-white"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
                {isSubmitting ? "Saving…" : editingMovie ? "Update Content" : "Add Content"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleting !== null} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;{movieBeingDeleted?.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-black text-white hover:bg-black/80">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster upload
// ---------------------------------------------------------------------------

function PosterUploadButton({ catalog, onUploaded }: { catalog: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files can be uploaded");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be 10MB or smaller");
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("catalog", catalog);
      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: form,
      });
      const result = await jsonResponse<{ url: string }>(response);
      if (result.success) {
        onUploaded(result.data?.url ?? "");
        toast.success("Poster uploaded");
      } else {
        toast.error(result.error || "Failed to upload image");
      }
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading || !catalog.replace(/[_-]/g, "").trim()}
        onClick={() => inputRef.current?.click()}
        className="shrink-0 rounded-sm border-black text-black shadow-none hover:bg-black hover:text-white"
      >
        <UploadSimpleIcon className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading…" : "Upload"}
      </Button>
    </>
  );
}

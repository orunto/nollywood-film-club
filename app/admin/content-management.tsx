'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusIcon, PencilSimpleIcon, TrashIcon, StarIcon, MagnifyingGlassIcon, CheckIcon, CaretUpDownIcon, ArrowSquareOutIcon, XIcon } from "@phosphor-icons/react";
import { EmptyListIllustration } from '@/components/graphics';
import { CastMember, Content } from '@/lib/server-queries';
import { contentTypeLabel, viewingCategoryLabel, VIEWING_CATEGORIES, type ViewingCategory } from '@/lib/utils';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';
import { AdminDiscussion } from './discussions-management';
import UploadImageButton from './upload-image-button';

interface JustWatchResult {
  id: string;
  title: string;
  contentType: 'movie' | 'tv_show';
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

// Sentinel for the discussion picker: not an id, means "create a new discussion
// from the fields below and link it to this content on save"
const NEW_DISCUSSION = '__new__';

const emptyDiscussionDraft = {
  episodeNumber: '',
  title: '',
  spaceUrl: '',
  discussionDate: '',
  podcastLinks: '',
};

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs text-black bg-transparent border border-black rounded-sm";

const sortAccessors: SortAccessors<Content> = {
  title: (m) => m.title,
  type: (m) => m.contentType,
  rating: (m) => m.rating,
  runtime: (m) => m.runtime,
  released: (m) => (m.releaseDate ? new Date(m.releaseDate) : null),
};

export default function ContentManagement() {
  const [movies, setMovies] = useState<Content[]>([]);
  const [discussions, setDiscussions] = useState<AdminDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv_show' | 'short_film'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Content | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [jwQuery, setJwQuery] = useState('');
  const [jwResults, setJwResults] = useState<JustWatchResult[]>([]);
  const [isSearchingJw, setIsSearchingJw] = useState(false);
  const [importedPosterUrl, setImportedPosterUrl] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [linkedDiscussionId, setLinkedDiscussionId] = useState('');
  const [discussionPickerOpen, setDiscussionPickerOpen] = useState(false);
  // Fields for a discussion created inline; only read when linkedDiscussionId
  // is NEW_DISCUSSION. episodeNumber clashes report back into episodeError.
  const [discussionDraft, setDiscussionDraft] = useState(emptyDiscussionDraft);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  // Seeded from a JustWatch import or the row being edited, then editable by
  // hand below. Blank rows are dropped server-side — see lib/cast.ts
  const [castMembers, setCastMembers] = useState<CastMember[] | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contentType: 'movie' as 'movie' | 'tv_show' | 'short_film',
    runtime: '',
    releaseDate: '',
    rating: '',
    synopsis: '',
    genre: '',
    posterImage: '',
    posterVersion: null as number | null,
    trailerUrl: '',
    streamingUrl: '',
    streamingPlatform: '',
    otherPlatform: '',
    viewingCategory: '' as ViewingCategory | '',
    isMovieOfTheWeek: false,
  });

  const formatDate =(date: string | Date | null): string => {
    if (!date) return '';
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async (isInitial = false) => {
    try {
      const [moviesResponse, discussionsResponse] = await Promise.all([
        fetch('/api/admin/movies'),
        fetch('/api/admin/discussions'),
      ]);
      const data = await moviesResponse.json();
      const discussionsData = await discussionsResponse.json();
      if (data.success) {
        setMovies(data.data);
      } else if (isInitial) {
        toast.error('Failed to load movies');
      }
      if (discussionsData.success) {
        setDiscussions(discussionsData.data);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
      if (isInitial) toast.error('Failed to load movies');
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
      const data = await response.json();
      if (data.success) {
        setJwResults(data.data);
        if (data.data.length === 0) {
          toast.info('No JustWatch results found');
        }
      } else {
        toast.error(data.error || 'JustWatch search failed');
      }
    } catch (error) {
      console.error('Error searching JustWatch:', error);
      toast.error('JustWatch search failed. Please try again.');
    } finally {
      setIsSearchingJw(false);
    }
  };

  const importFromJustWatch = async (result: JustWatchResult) => {
    setFormData((prev) => ({
      ...prev,
      title: result.title,
      contentType: result.contentType,
      runtime: result.runtime?.toString() ?? '',
      releaseDate: result.releaseDate ?? '',
      rating: result.rating ?? '',
      synopsis: result.synopsis ?? '',
      genre: result.genre,
      trailerUrl: result.trailerUrl ?? '',
      streamingUrl: result.streamingUrl ?? '',
      streamingPlatform: result.streamingPlatform ?? '',
      otherPlatform: result.otherPlatform ?? '',
      // A JustWatch offer means it is streaming somewhere right now, so say so
      // rather than making someone set it by hand. No offer says nothing about
      // where the film is, so leave whatever is already selected alone.
      viewingCategory: result.streamingUrl ? 'streaming' : prev.viewingCategory,
    }));
    setCastMembers(result.castMembers);
    setImportedPosterUrl(result.posterUrl);
    setJwResults([]);
    toast.success(`Imported "${result.title}" from JustWatch`);

    // Upload the JustWatch poster to Cloudinary so posterImage gets a real public ID
    if (result.posterUrl) {
      setIsUploadingPoster(true);
      try {
        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: result.posterUrl,
            title: result.title,
            releaseDate: result.releaseDate,
          }),
        });
        const uploadResult = await response.json();
        if (uploadResult.success) {
          setFormData((prev) => ({
            ...prev,
            posterImage: uploadResult.data.publicId,
            posterVersion: uploadResult.data.version,
          }));
          setImportedPosterUrl(null);
          toast.success('Poster uploaded to Cloudinary');
        } else {
          toast.error(uploadResult.error || 'Poster upload failed — add it via the JustWatch poster link');
        }
      } catch (error) {
        console.error('Error uploading poster:', error);
        toast.error('Poster upload failed — add it via the JustWatch poster link');
      } finally {
        setIsUploadingPoster(false);
      }
    }
  };

  // Point the chosen discussion's contentId at this content; unlink the previous one if it changed
  const syncDiscussionLink = async (contentId: string) => {
    const prevLinkedId = editingMovie
      ? discussions.find((d) => d.contentId === editingMovie.id)?.id ?? ''
      : '';
    if (prevLinkedId === linkedDiscussionId) return;
    try {
      if (prevLinkedId) {
        await fetch(`/api/admin/discussions/${prevLinkedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId: null }),
        });
      }
      // NEW_DISCUSSION has nothing to link yet — createLinkedDiscussion makes it
      if (linkedDiscussionId && linkedDiscussionId !== NEW_DISCUSSION) {
        const response = await fetch(`/api/admin/discussions/${linkedDiscussionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId }),
        });
        const result = await response.json();
        if (!result.success) {
          toast.error(result.error || 'Content saved, but linking the discussion failed');
        }
      }
    } catch (error) {
      console.error('Error linking discussion:', error);
      toast.error('Content saved, but linking the discussion failed');
    }
  };

  // Creates the inline discussion and links it to the just-saved content.
  // Returns false only when the form should stay open for a fix — a clashing
  // episode number, which is the one failure the admin can act on.
  const createLinkedDiscussion = async (contentId: string): Promise<boolean> => {
    if (linkedDiscussionId !== NEW_DISCUSSION) return true;
    try {
      const response = await fetch('/api/admin/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Title defaults to the film's — the common case is "the episode about X"
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
      const result = await response.json();
      if (result.success) return true;

      if (result.field === 'episodeNumber') {
        setEpisodeError(result.error);
        return false;
      }
      toast.error(result.error || 'Content saved, but creating the discussion failed');
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast.error('Content saved, but creating the discussion failed');
    }
    return true;
  };

  const addCastMember = (role: CastMember['role']) => {
    setCastMembers((prev) => [...(prev ?? []), { role, name: '', characterName: null }]);
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
        runtime: formData.runtime ? parseInt(formData.runtime) : null,
        releaseDate: formData.releaseDate ? formatDate(formData.releaseDate) : null,
        genre: formData.genre ? formData.genre.split(',').map(g => g.trim()) : [],
        castMembers,
      };

      const url = editingMovie ? `/api/admin/movies/${editingMovie.id}` : '/api/admin/movies';
      const method = editingMovie ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData),
      });

      const result = await response.json();
      if (result.success) {
        const savedContentId: string | undefined = result.data?.id ?? editingMovie?.id;
        const wasAdding = !editingMovie;
        if (savedContentId) {
          await syncDiscussionLink(savedContentId);
          const discussionSaved = await createLinkedDiscussion(savedContentId);
          if (!discussionSaved) {
            // The content row is already saved — switch the open form over to
            // editing it so fixing the episode number and resubmitting updates
            // that row instead of adding a second one.
            await fetchMovies();
            if (wasAdding && result.data) setEditingMovie(result.data);
            toast.error('Content saved — fix the episode number to create the discussion');
            return;
          }
        }
        await fetchMovies();
        toast.success(`Movie ${wasAdding ? 'added' : 'updated'} successfully`);
        setIsFormOpen(false);
        setEditingMovie(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingMovie ? 'update' : 'add'} movie`);
      }
    } catch (error) {
      console.error('Error saving movie:', error);
      toast.error(`Failed to ${editingMovie ? 'update' : 'add'} movie. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingMovie(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (movie: Content) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      contentType: movie.contentType,
      runtime: movie.runtime?.toString() || '',
      releaseDate: movie.releaseDate ? formatDate(movie.releaseDate) : '',
      rating: movie.rating || '',
      synopsis: movie.synopsis || '',
      genre: movie.genre?.join(', ') || '',
      posterImage: movie.posterImage || '',
      posterVersion: movie.posterVersion,
      trailerUrl: movie.trailerUrl || '',
      streamingUrl: movie.streamingUrl || '',
      streamingPlatform: movie.streamingPlatform || '',
      otherPlatform: movie.otherPlatform || '',
      viewingCategory: movie.viewingCategory || '',
      isMovieOfTheWeek: movie.isMovieOfTheWeek,
    });
    setCastMembers(movie.castMembers);
    setJwQuery('');
    setJwResults([]);
    setImportedPosterUrl(null);
    setLinkedDiscussionId(discussions.find((d) => d.contentId === movie.id)?.id ?? '');
    setDiscussionDraft(emptyDiscussionDraft);
    setEpisodeError(null);
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/movies/${isDeleting}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await fetchMovies();
        toast.success('Movie deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete movie');
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
      toast.error('Failed to delete movie. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleMovieOfTheWeek = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/movies/${id}/movie-of-the-week`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isMovieOfTheWeek: !currentValue }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchMovies();
        toast.success(currentValue ? 'Removed from Movie of the Week' : 'Set as Movie of the Week');
      } else {
        toast.error(result.error || 'Failed to update Movie of the Week');
      }
    } catch (error) {
      console.error('Error updating movie of the week:', error);
      toast.error('Failed to update Movie of the Week. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      contentType: 'movie',
      runtime: '',
      releaseDate: '',
      rating: '',
      synopsis: '',
      genre: '',
      posterImage: '',
      posterVersion: null,
      trailerUrl: '',
      streamingUrl: '',
      streamingPlatform: '',
      otherPlatform: '',
      viewingCategory: '',
      isMovieOfTheWeek: false,
    });
    setCastMembers(null);
    setJwQuery('');
    setJwResults([]);
    setImportedPosterUrl(null);
    setLinkedDiscussionId('');
    setDiscussionDraft(emptyDiscussionDraft);
    setEpisodeError(null);
  };

  const filteredMovies = movies.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesType = typeFilter === 'all' || m.contentType === typeFilter;
    return matchesSearch && matchesType;
  });
  const movieBeingDeleted = movies.find((m) => m.id === isDeleting);
  const isFiltered = searchQuery.trim() !== '' || typeFilter !== 'all';
  const { sorted: sortedMovies, sortKey, direction, toggleSort } = useTableSort(filteredMovies, sortAccessors);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Content Management</h2>
          <p className="text-sm font-light text-black/60">Manage movies and TV shows</p>
        </div>
        <Button onClick={handleAdd} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by title…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`max-w-sm ${inputClass}`}
        />
        <Select value={typeFilter} onValueChange={(value: 'all' | 'movie' | 'tv_show' | 'short_film') => setTypeFilter(value)}>
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
      </div>

      {loading ? (
        <div className="border border-black/10 rounded-sm divide-y divide-black/10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3 bg-black/10" />
                <Skeleton className="h-3 w-1/4 bg-black/10" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <EmptyListIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
          <h2 className="text-xl font-semibold mb-2">
            {isFiltered ? 'No matches found' : 'Coming Soon...'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isFiltered
              ? 'No content matches your search/filter.'
              : 'No content yet. Click "Add Content" to create one.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="Title" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Type" sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Rating" sortKey="rating" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Runtime" sortKey="runtime" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Released" sortKey="released" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMovies.map((movie) => (
                <TableRow key={movie.id} className="border-black/10 hover:bg-black/5 group">
                  <TableCell className="font-medium whitespace-normal">
                    <div className="flex items-center gap-2 flex-wrap">
                      {movie.title}
                      {movie.isMovieOfTheWeek && (
                        <Badge className="text-xs bg-black text-white rounded-sm shrink-0">
                          <StarIcon weight="fill" className="w-3 h-3 mr-1" />
                          MOTW
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge className={badgeClass}>
                        {contentTypeLabel(movie.contentType)}
                      </Badge>
                      {movie.viewingCategory && (
                        <Badge className={badgeClass}>
                          {viewingCategoryLabel(movie.viewingCategory)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-black/60">{movie.rating || '—'}</TableCell>
                  <TableCell className="text-black/60">
                    {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '—'}
                  </TableCell>
                  <TableCell className="text-black/60">
                    {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleMovieOfTheWeek(movie.id, movie.isMovieOfTheWeek)}
                        title={movie.isMovieOfTheWeek ? 'Remove from Movie of the Week' : 'Set as Movie of the Week'}
                      >
                        <StarIcon weight={movie.isMovieOfTheWeek ? 'fill' : 'regular'} className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => handleEdit(movie)}>
                        <PencilSimpleIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => setIsDeleting(movie.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 rounded-none shadow-none">
          <SheetHeader>
            <SheetTitle>{editingMovie ? 'Edit Content' : 'Add New Content'}</SheetTitle>
            <SheetDescription>
              {editingMovie ? 'Update movie/TV show information' : 'Add a new movie or TV show to the database'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="border border-black/10 rounded-sm p-3 space-y-2">
                <Label htmlFor="jwSearch">Import from JustWatch</Label>
                <div className="flex gap-2">
                  <Input
                    id="jwSearch"
                    className={inputClass}
                    value={jwQuery}
                    onChange={(e) => setJwQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
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
                    className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none shrink-0"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    {isSearchingJw ? 'Searching…' : 'Search'}
                  </Button>
                </div>
                {jwResults.length > 0 && (
                  <div className="border border-black/10 rounded-sm divide-y divide-black/10 max-h-64 overflow-y-auto">
                    {jwResults.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => importFromJustWatch(result)}
                        className="w-full flex items-center gap-3 p-2 text-left hover:bg-black/5 transition-colors"
                      >
                        {result.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.posterUrl}
                            alt=""
                            className="w-8 h-12 object-cover rounded-sm shrink-0 border border-black/10"
                          />
                        ) : (
                          <div className="w-8 h-12 rounded-sm shrink-0 bg-black/5 border border-black/10" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs font-light text-black/60 truncate">
                            {result.contentType === 'movie' ? 'Movie' : 'TV Show'}
                            {result.year && <> · {result.year}</>}
                            {(result.otherPlatform || result.streamingPlatform) && (
                              <> · {result.otherPlatform || result.streamingPlatform?.replace(/_/g, ' ')}</>
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
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    className={inputClass}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select
                    value={formData.contentType}
                    onValueChange={(value: 'movie' | 'tv_show' | 'short_film') => setFormData({ ...formData, contentType: value })}
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

              <div>
                <Label>S/N (Catalog Number)</Label>
                <p className="text-sm text-black/60 mt-1">
                  {editingMovie?.catalogNumber != null
                    ? `#${editingMovie.catalogNumber} — derived from the linked episode number below`
                    : 'Assigned automatically once a discussion is linked below'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="runtime">Runtime (minutes)</Label>
                  <Input
                    id="runtime"
                    type="number"
                    className={inputClass}
                    value={formData.runtime}
                    onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    className={inputClass}
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(value) => setFormData({ ...formData, rating: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="PG">PG</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="NC-17">NC-17</SelectItem>
                      <SelectItem value="TV-Y">TV-Y</SelectItem>
                      <SelectItem value="TV-Y7">TV-Y7</SelectItem>
                      <SelectItem value="TV-G">TV-G</SelectItem>
                      <SelectItem value="TV-PG">TV-PG</SelectItem>
                      <SelectItem value="TV-14">TV-14</SelectItem>
                      <SelectItem value="TV-MA">TV-MA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="genre">Genres (comma-separated)</Label>
                <Input
                  id="genre"
                  className={inputClass}
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Comedy, Drama, Action"
                />
              </div>

              <div>
                <Label htmlFor="synopsis">Synopsis</Label>
                <Textarea
                  id="synopsis"
                  className={inputClass}
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Poster Image</Label>
                <div className="flex items-center gap-2">
                  <UploadImageButton
                    title={formData.title}
                    releaseDate={formData.releaseDate}
                    onUploaded={(publicId, version) =>
                      setFormData((prev) => ({ ...prev, posterImage: publicId, posterVersion: version }))
                    }
                  />
                  {formData.posterImage ? (
                    <>
                      <span className="text-xs font-light text-black/60 truncate">{formData.posterImage}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10 shrink-0"
                        onClick={() => setFormData((prev) => ({ ...prev, posterImage: '', posterVersion: null }))}
                        title="Remove poster"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs font-light text-black/50">No poster uploaded yet</span>
                  )}
                </div>
                {isUploadingPoster && (
                  <p className="text-xs font-light text-black/60 mt-1">Uploading JustWatch poster to Cloudinary…</p>
                )}
                {importedPosterUrl && !isUploadingPoster && (
                  <p className="text-xs font-light text-black/60 mt-1">
                    <a
                      href={importedPosterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-black inline-flex items-center gap-1"
                    >
                      JustWatch poster
                      <ArrowSquareOutIcon className="w-3 h-3" />
                    </a>
                    {' '}— auto-upload failed; download it and use the Upload button.
                  </p>
                )}
              </div>

              <div>
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
                <div>
                  <Label htmlFor="streamingPlatform">Streaming Platform</Label>
                  <Select
                    value={formData.streamingPlatform}
                    onValueChange={(value) => setFormData({ ...formData, streamingPlatform: value })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="netflix">Netflix</SelectItem>
                      <SelectItem value="prime_video">Prime Video</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="disney_plus">Disney Plus</SelectItem>
                      <SelectItem value="hulu">Hulu</SelectItem>
                      <SelectItem value="hbo_max">HBO Max</SelectItem>
                      <SelectItem value="apple_tv">Apple TV</SelectItem>
                      <SelectItem value="paramount_plus">Paramount Plus</SelectItem>
                      <SelectItem value="peacock">Peacock</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="streamingUrl">Streaming URL</Label>
                  <Input
                    id="streamingUrl"
                    className={inputClass}
                    value={formData.streamingUrl}
                    onChange={(e) => setFormData({ ...formData, streamingUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
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

              {formData.streamingPlatform === 'other' && (
                <div>
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
                      className="rounded-sm border-black/20 shadow-none font-normal"
                      onClick={() => addCastMember('director')}
                    >
                      <PlusIcon className="w-3 h-3" />
                      Director
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-sm border-black/20 shadow-none font-normal"
                      onClick={() => addCastMember('actor')}
                    >
                      <PlusIcon className="w-3 h-3" />
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
                        <Badge className={`${badgeClass} shrink-0 w-16 justify-center`}>
                          {member.role === 'director' ? 'Director' : 'Actor'}
                        </Badge>
                        <Input
                          className={`${inputClass} flex-1`}
                          value={member.name}
                          onChange={(e) => updateCastMember(index, { name: e.target.value })}
                          placeholder="Name"
                          aria-label={`${member.role === 'director' ? 'Director' : 'Actor'} name`}
                        />
                        {member.role === 'actor' && (
                          <Input
                            className={`${inputClass} flex-1`}
                            value={member.characterName ?? ''}
                            onChange={(e) => updateCastMember(index, { characterName: e.target.value })}
                            placeholder="Character (optional)"
                            aria-label="Character name"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-black/60 hover:text-black hover:bg-black/10"
                          onClick={() => removeCastMember(index)}
                          aria-label={`Remove ${member.name || 'this entry'}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs font-light text-black/60">
                      Entries with no name are dropped when you save.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Linked Discussion Episode</Label>
                <Popover open={discussionPickerOpen} onOpenChange={setDiscussionPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={discussionPickerOpen}
                      className={`w-full justify-between font-normal ${inputClass} ${linkedDiscussionId ? '' : 'text-black/50'}`}
                    >
                      <span className="truncate">
                        {(() => {
                          if (linkedDiscussionId === NEW_DISCUSSION) return 'New discussion';
                          const linked = discussions.find((d) => d.id === linkedDiscussionId);
                          if (!linked) return 'Search discussion episodes…';
                          return `${linked.episodeNumber !== null ? `#${linked.episodeNumber} · ` : ''}${linked.title}`;
                        })()}
                      </span>
                      <CaretUpDownIcon className="w-4 h-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-sm" align="start">
                    <Command>
                      <CommandInput placeholder="Search by title or episode #…" />
                      <CommandList>
                        <CommandEmpty>No discussions found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setLinkedDiscussionId('');
                              setDiscussionPickerOpen(false);
                            }}
                          >
                            <CheckIcon className={`w-4 h-4 ${linkedDiscussionId === '' ? 'opacity-100' : 'opacity-0'}`} />
                            None
                          </CommandItem>
                          <CommandItem
                            value="__create__ new discussion"
                            onSelect={() => {
                              setLinkedDiscussionId(NEW_DISCUSSION);
                              setEpisodeError(null);
                              // Seed the title from the film — the usual case
                              setDiscussionDraft((prev) => ({
                                ...prev,
                                title: prev.title || formData.title,
                              }));
                              setDiscussionPickerOpen(false);
                            }}
                          >
                            <PlusIcon className="w-4 h-4" />
                            Create new discussion
                          </CommandItem>
                          {discussions.map((discussion) => (
                            <CommandItem
                              key={discussion.id}
                              value={`${discussion.episodeNumber ?? ''} ${discussion.title}`}
                              onSelect={() => {
                                setLinkedDiscussionId(discussion.id);
                                setDiscussionPickerOpen(false);
                              }}
                            >
                              <CheckIcon className={`w-4 h-4 ${linkedDiscussionId === discussion.id ? 'opacity-100' : 'opacity-0'}`} />
                              <span className="truncate">
                                {discussion.episodeNumber !== null && `#${discussion.episodeNumber} · `}
                                {discussion.title}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs font-light text-black/60 mt-1">
                  {linkedDiscussionId === NEW_DISCUSSION
                    ? 'The discussion will be created and linked to this content when you save.'
                    : 'The selected discussion will be linked to this content when you save.'}
                </p>
              </div>

              {linkedDiscussionId === NEW_DISCUSSION && (
                <div className="flex flex-col gap-4 border border-black/20 rounded-sm p-4">
                  <div className="grid grid-cols-[7rem_1fr] gap-4">
                    <div>
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
                    <div>
                      <Label htmlFor="discussionTitle">Discussion Title</Label>
                      <Input
                        id="discussionTitle"
                        className={inputClass}
                        value={discussionDraft.title}
                        onChange={(e) => setDiscussionDraft({ ...discussionDraft, title: e.target.value })}
                        placeholder={formData.title || 'Defaults to the film title'}
                      />
                    </div>
                  </div>
                  {episodeError && (
                    <p className="text-xs text-red-700 -mt-2">{episodeError}</p>
                  )}

                  <div>
                    <Label htmlFor="spaceUrl">Space URL</Label>
                    <Input
                      id="spaceUrl"
                      className={inputClass}
                      value={discussionDraft.spaceUrl}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, spaceUrl: e.target.value })}
                      placeholder="https://x.com/i/spaces/…"
                    />
                  </div>

                  <div>
                    <Label htmlFor="discussionDate">Discussion Date</Label>
                    <Input
                      id="discussionDate"
                      type="date"
                      className={inputClass}
                      value={discussionDraft.discussionDate}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, discussionDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="podcastLinks">Podcast Links</Label>
                    <Textarea
                      id="podcastLinks"
                      className={inputClass}
                      rows={2}
                      value={discussionDraft.podcastLinks}
                      onChange={(e) => setDiscussionDraft({ ...discussionDraft, podcastLinks: e.target.value })}
                      placeholder="One per line, or comma separated"
                    />
                    <p className="text-xs font-light text-black/60 mt-1">
                      Adding a podcast link lets people rate the film straight away, instead of waiting 24 hours.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isMovieOfTheWeek"
                  checked={formData.isMovieOfTheWeek}
                  onCheckedChange={(checked) => setFormData({ ...formData, isMovieOfTheWeek: checked })}
                />
                <Label htmlFor="isMovieOfTheWeek">Movie of the Week</Label>
              </div>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="border-black text-black bg-transparent hover:bg-black hover:text-white rounded-sm shadow-none" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
                {isSubmitting ? 'Saving…' : editingMovie ? 'Update Content' : 'Add Content'}
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

'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Content } from '@/lib/server-queries';
import { contentTypeLabel } from '@/lib/utils';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs text-black bg-transparent border border-black rounded-sm";

const NO_CONTENT = 'none';

export interface AdminDiscussion {
  id: string;
  title: string;
  description: string | null;
  contentId: string | null;
  spaceUrl: string | null;
  podcastLinks: string[] | null;
  episodeNumber: number | null;
  discussionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DiscussionsManagement() {
  const [discussions, setDiscussions] = useState<AdminDiscussion[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<AdminDiscussion | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentId: NO_CONTENT,
    spaceUrl: '',
    podcastLinks: '',
    episodeNumber: '',
    discussionDate: '',
  });

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (isInitial = false) => {
    try {
      const [discussionsResponse, moviesResponse] = await Promise.all([
        fetch('/api/admin/discussions'),
        fetch('/api/admin/movies')
      ]);

      const discussionsData = await discussionsResponse.json();
      const moviesData = await moviesResponse.json();

      if (discussionsData.success) {
        setDiscussions(discussionsData.data);
      } else if (isInitial) {
        toast.error('Failed to load discussions');
      }
      if (moviesData.success) {
        setMovies(moviesData.data);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
      if (isInitial) toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const discussionData = {
        title: formData.title,
        description: formData.description || null,
        contentId: formData.contentId === NO_CONTENT ? null : formData.contentId,
        spaceUrl: formData.spaceUrl || null,
        podcastLinks: formData.podcastLinks
          ? formData.podcastLinks.split('\n').map((l) => l.trim()).filter(Boolean)
          : [],
        episodeNumber: formData.episodeNumber !== '' ? parseInt(formData.episodeNumber) : null,
        discussionDate: formData.discussionDate || null,
      };

      const url = editingDiscussion ? `/api/admin/discussions/${editingDiscussion.id}` : '/api/admin/discussions';
      const method = editingDiscussion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discussionData),
      });

      const result = await response.json();
      if (result.success) {
        await fetchData();
        toast.success(`Discussion ${editingDiscussion ? 'updated' : 'added'} successfully`);
        setIsFormOpen(false);
        setEditingDiscussion(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingDiscussion ? 'update' : 'add'} discussion`);
      }
    } catch (error) {
      console.error('Error saving discussion:', error);
      toast.error(`Failed to ${editingDiscussion ? 'update' : 'add'} discussion. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingDiscussion(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (discussion: AdminDiscussion) => {
    setEditingDiscussion(discussion);
    setFormData({
      title: discussion.title,
      description: discussion.description || '',
      contentId: discussion.contentId || NO_CONTENT,
      spaceUrl: discussion.spaceUrl || '',
      podcastLinks: discussion.podcastLinks?.join('\n') || '',
      episodeNumber: discussion.episodeNumber?.toString() ?? '',
      discussionDate: discussion.discussionDate
        ? new Date(discussion.discussionDate).toISOString().split('T')[0]
        : '',
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/discussions/${isDeleting}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await fetchData();
        toast.success('Discussion deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete discussion');
      }
    } catch (error) {
      console.error('Error deleting discussion:', error);
      toast.error('Failed to delete discussion. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      contentId: NO_CONTENT,
      spaceUrl: '',
      podcastLinks: '',
      episodeNumber: '',
      discussionDate: '',
    });
  };

  const movieTitleById = useMemo(
    () => new Map(movies.map((m) => [m.id, m.title])),
    [movies],
  );

  const sortAccessors = useMemo<SortAccessors<AdminDiscussion>>(() => ({
    sn: (d) => d.episodeNumber,
    title: (d) => d.title,
    content: (d) => (d.contentId ? movieTitleById.get(d.contentId) ?? null : null),
    date: (d) => (d.discussionDate ? new Date(d.discussionDate) : null),
    links: (d) => (d.spaceUrl ? 1 : 0) + (d.podcastLinks?.length ?? 0),
  }), [movieTitleById]);

  const filteredDiscussions = discussions.filter((d) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const contentTitle = d.contentId ? movieTitleById.get(d.contentId) ?? '' : '';
    return d.title.toLowerCase().includes(q) || contentTitle.toLowerCase().includes(q);
  });
  const discussionBeingDeleted = discussions.find((d) => d.id === isDeleting);
  const { sorted: sortedDiscussions, sortKey, direction, toggleSort } = useTableSort(filteredDiscussions, sortAccessors);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Discussions Management</h2>
          <p className="text-sm font-light text-black/60">Manage discussion spaces and podcast episodes</p>
        </div>
        <Button onClick={handleAdd} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
          <Plus className="w-4 h-4 mr-2" />
          Add Discussion
        </Button>
      </div>

      <Input
        placeholder="Search by title or content…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`max-w-sm ${inputClass}`}
      />

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
      ) : filteredDiscussions.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matches found' : 'Coming Soon...'}
          </h2>
          <p className="text-gray-600 text-sm">
            {searchQuery
              ? `No discussions match "${searchQuery}".`
              : 'No discussions yet. Click "Add Discussion" to create one.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="S/N" sortKey="sn" activeKey={sortKey} direction={direction} onSort={toggleSort} className="w-16" />
                <SortableHead label="Title" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Content" sortKey="content" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Date" sortKey="date" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Links" sortKey="links" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDiscussions.map((discussion) => {
                const contentTitle = discussion.contentId
                  ? movieTitleById.get(discussion.contentId)
                  : null;
                const podcastCount = discussion.podcastLinks?.length ?? 0;
                return (
                  <TableRow key={discussion.id} className="border-black/10 hover:bg-black/5 group">
                    <TableCell className="text-black/60">{discussion.episodeNumber ?? '—'}</TableCell>
                    <TableCell className="font-medium whitespace-normal">{discussion.title}</TableCell>
                    <TableCell className="whitespace-normal">
                      {contentTitle ? (
                        <span className="text-black/60">{contentTitle}</span>
                      ) : (
                        <Badge className={badgeClass}>Standalone</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-black/60">
                      {discussion.discussionDate ? new Date(discussion.discussionDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-black/60">
                      {discussion.spaceUrl || podcastCount > 0 ? (
                        <span>
                          {discussion.spaceUrl && 'Space'}
                          {discussion.spaceUrl && podcastCount > 0 && ' · '}
                          {podcastCount > 0 && `${podcastCount} podcast ${podcastCount === 1 ? 'link' : 'links'}`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {discussion.spaceUrl && (
                          <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" asChild>
                            <a href={discussion.spaceUrl} target="_blank" rel="noopener noreferrer" title="Open space">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => handleEdit(discussion)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => setIsDeleting(discussion.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 rounded-none shadow-none">
          <SheetHeader>
            <SheetTitle>{editingDiscussion ? 'Edit Discussion' : 'Add New Discussion'}</SheetTitle>
            <SheetDescription>
              {editingDiscussion ? 'Update discussion information' : 'Add a new discussion space or podcast episode'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <Label htmlFor="contentId">Movie/TV Show (optional)</Label>
                <Select
                  value={formData.contentId}
                  onValueChange={(value) => setFormData({ ...formData, contentId: value })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select movie/TV show" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CONTENT}>None (standalone topic)</SelectItem>
                    {movies.map((movie) => (
                      <SelectItem key={movie.id} value={movie.id}>
                        {movie.title} ({contentTypeLabel(movie.contentType)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="episodeNumber">S/N (Episode Number)</Label>
                  <Input
                    id="episodeNumber"
                    type="number"
                    className={inputClass}
                    value={formData.episodeNumber}
                    onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })}
                    placeholder="0 for intro"
                  />
                </div>
                <div>
                  <Label htmlFor="discussionDate">Discussion Date</Label>
                  <Input
                    id="discussionDate"
                    type="date"
                    className={inputClass}
                    value={formData.discussionDate}
                    onChange={(e) => setFormData({ ...formData, discussionDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className={inputClass}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="spaceUrl">Space URL (Twitter/X)</Label>
                <Input
                  id="spaceUrl"
                  type="url"
                  className={inputClass}
                  value={formData.spaceUrl}
                  onChange={(e) => setFormData({ ...formData, spaceUrl: e.target.value })}
                  placeholder="https://x.com/i/spaces/..."
                />
              </div>

              <div>
                <Label htmlFor="podcastLinks">Podcast Links (one per line)</Label>
                <Textarea
                  id="podcastLinks"
                  className={inputClass}
                  value={formData.podcastLinks}
                  onChange={(e) => setFormData({ ...formData, podcastLinks: e.target.value })}
                  rows={3}
                  placeholder={'https://open.spotify.com/episode/...\nhttps://music.youtube.com/...'}
                />
              </div>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="border-black text-black bg-transparent hover:bg-black hover:text-white rounded-sm shadow-none" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
                {isSubmitting ? 'Saving…' : editingDiscussion ? 'Update Discussion' : 'Add Discussion'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleting !== null} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete discussion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;{discussionBeingDeleted?.title}&quot;.
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

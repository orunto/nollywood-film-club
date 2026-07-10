'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Edit, Trash2, ExternalLink, X } from 'lucide-react';
import { Review, Content } from '@/lib/server-queries';
import { toast } from 'sonner';
import UploadImageButton from './upload-image-button';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movies, setMovies] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contentId: '',
    title: '',
    description: '',
    score: '',
    reviewer: '',
    externalUrl: '',
    reviewImage: '',
    publishedAt: '',
  });

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (isInitial = false) => {
    try {
      const [reviewsResponse, moviesResponse] = await Promise.all([
        fetch('/api/admin/reviews'),
        fetch('/api/admin/movies')
      ]);

      const reviewsData = await reviewsResponse.json();
      const moviesData = await moviesResponse.json();

      if (reviewsData.success) {
        setReviews(reviewsData.data);
      } else if (isInitial) {
        toast.error('Failed to load reviews');
      }
      if (moviesData.success) {
        setMovies(moviesData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (isInitial) toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const reviewData = {
        ...formData,
        score: formData.score ? parseFloat(formData.score) : null,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
      };

      const url = editingReview ? `/api/admin/reviews/${editingReview.id}` : '/api/admin/reviews';
      const method = editingReview ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      const result = await response.json();
      if (result.success) {
        await fetchData();
        toast.success(`Review ${editingReview ? 'updated' : 'added'} successfully`);
        setIsFormOpen(false);
        setEditingReview(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingReview ? 'update' : 'add'} review`);
      }
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error(`Failed to ${editingReview ? 'update' : 'add'} review. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingReview(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setFormData({
      contentId: review.contentId,
      title: review.title,
      description: review.description,
      score: review.score?.toString() || '',
      reviewer: review.reviewer,
      externalUrl: review.externalUrl || '',
      reviewImage: review.reviewImage || '',
      publishedAt: review.publishedAt ? new Date(review.publishedAt).toISOString().split('T')[0] : '',
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/reviews/${isDeleting}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await fetchData();
        toast.success('Review deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      contentId: '',
      title: '',
      description: '',
      score: '',
      reviewer: '',
      externalUrl: '',
      reviewImage: '',
      publishedAt: '',
    });
  };

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const movieTitle = movies.find((m) => m.id === r.contentId)?.title ?? '';
    return r.title.toLowerCase().includes(q) || movieTitle.toLowerCase().includes(q);
  });
  const reviewBeingDeleted = reviews.find((r) => r.id === isDeleting);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Reviews Management</h2>
          <p className="text-sm font-light text-black/60">Manage external reviews for movies and TV shows</p>
        </div>
        <Button onClick={handleAdd} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
          <Plus className="w-4 h-4 mr-2" />
          Add Review
        </Button>
      </div>

      <Input
        placeholder="Search by title…"
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
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matches found' : 'Coming Soon...'}
          </h2>
          <p className="text-gray-600 text-sm">
            {searchQuery
              ? `No reviews match "${searchQuery}".`
              : 'No reviews yet. Click "Add Review" to create one.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm divide-y divide-black/10">
          {filteredReviews.map((review) => {
            const movie = movies.find(m => m.id === review.contentId);
            return (
              <div key={review.id} className="flex items-center justify-between gap-4 p-3 hover:bg-black/5 transition-colors group">
                <div className="min-w-0 flex-1">
                  <span className="font-medium truncate">{review.title}</span>
                  <p className="text-xs font-light text-black/60 truncate">
                    By {review.reviewer}
                    {movie && <> · For {movie.title}</>}
                    {review.score !== null && <> · Score {review.score}/10</>}
                    {review.publishedAt && <> · Published {new Date(review.publishedAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {review.externalUrl && (
                    <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" asChild>
                      <a href={review.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => handleEdit(review)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => setIsDeleting(review.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0 rounded-none shadow-none">
          <SheetHeader>
            <SheetTitle>{editingReview ? 'Edit Review' : 'Add New Review'}</SheetTitle>
            <SheetDescription>
              {editingReview ? 'Update review information' : 'Add a new external review or blog post'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <Label htmlFor="contentId">Movie/TV Show</Label>
                <Select
                  value={formData.contentId}
                  onValueChange={(value) => setFormData({ ...formData, contentId: value })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select movie/TV show" />
                  </SelectTrigger>
                  <SelectContent>
                    {movies.map((movie) => (
                      <SelectItem key={movie.id} value={movie.id}>
                        {movie.title} ({movie.contentType === 'movie' ? 'Movie' : 'TV Show'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  className={inputClass}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Review Description/Snippet</Label>
                <Textarea
                  id="description"
                  className={inputClass}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="score">Review Score</Label>
                  <Input
                    id="score"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    className={inputClass}
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="8.5"
                  />
                </div>
                <div>
                  <Label htmlFor="reviewer">Reviewer/Publication</Label>
                  <Input
                    id="reviewer"
                    className={inputClass}
                    value={formData.reviewer}
                    onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                    required
                    placeholder="WKMUp, Variety, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="externalUrl">External URL</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  className={inputClass}
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Review Image</Label>
                <div className="flex items-center gap-2">
                  <UploadImageButton
                    title={formData.title ? `${formData.title} review` : undefined}
                    releaseDate={formData.publishedAt}
                    onUploaded={(publicId) => setFormData((prev) => ({ ...prev, reviewImage: publicId }))}
                  />
                  {formData.reviewImage ? (
                    <>
                      <span className="text-xs font-light text-black/60 truncate">{formData.reviewImage}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10 shrink-0"
                        onClick={() => setFormData((prev) => ({ ...prev, reviewImage: '' }))}
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs font-light text-black/50">No image uploaded yet</span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="publishedAt">Published Date</Label>
                <Input
                  id="publishedAt"
                  type="date"
                  className={inputClass}
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                />
              </div>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="border-black text-black bg-transparent hover:bg-black hover:text-white rounded-sm shadow-none" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
                {isSubmitting ? 'Saving…' : editingReview ? 'Update Review' : 'Add Review'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleting !== null} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;{reviewBeingDeleted?.title}&quot;.
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

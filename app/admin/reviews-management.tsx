'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Review } from '@/lib/server-queries';

interface ReviewsManagementProps {}

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reviewsResponse, moviesResponse] = await Promise.all([
        fetch('/api/admin/reviews'),
        fetch('/api/admin/movies')
      ]);
      
      const reviewsData = await reviewsResponse.json();
      const moviesData = await moviesResponse.json();
      
      if (reviewsData.success) {
        setReviews(reviewsData.data);
      }
      if (moviesData.success) {
        setMovies(moviesData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingReview(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving review:', error);
    }
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
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      try {
        const response = await fetch(`/api/admin/reviews/${id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting review:', error);
      }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading reviews...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reviews Management</h2>
          <p className="text-gray-600">Manage external reviews and blog posts</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Review</DialogTitle>
              <DialogDescription>
                Add a new external review or blog post
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="contentId">Movie/TV Show</Label>
                <Select
                  value={formData.contentId}
                  onValueChange={(value) => setFormData({ ...formData, contentId: value })}
                  required
                >
                  <SelectTrigger>
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Review Description/Snippet</Label>
                <Textarea
                  id="description"
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
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="8.5"
                  />
                </div>
                <div>
                  <Label htmlFor="reviewer">Reviewer/Publication</Label>
                  <Input
                    id="reviewer"
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
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="reviewImage">Review Image (Cloudinary ID)</Label>
                <Input
                  id="reviewImage"
                  value={formData.reviewImage}
                  onChange={(e) => setFormData({ ...formData, reviewImage: e.target.value })}
                  placeholder="nollywood-film-club/review-image"
                />
              </div>

              <div>
                <Label htmlFor="publishedAt">Published Date</Label>
                <Input
                  id="publishedAt"
                  type="date"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Review</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {reviews.map((review) => {
          const movie = movies.find(m => m.id === review.contentId);
          return (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {review.title}
                      {review.externalUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={review.externalUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>
                      <span className="mr-4">By: {review.reviewer}</span>
                      {movie && <span className="mr-4">For: {movie.title}</span>}
                      {review.score && <span className="mr-4">Score: {review.score}/10</span>}
                      {review.publishedAt && <span>Published: {new Date(review.publishedAt).toLocaleDateString()}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(review)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(review.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">{review.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              Update review information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-contentId">Movie/TV Show</Label>
              <Select
                value={formData.contentId}
                onValueChange={(value) => setFormData({ ...formData, contentId: value })}
                required
              >
                <SelectTrigger>
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
              <Label htmlFor="edit-title">Review Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Review Description/Snippet</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-score">Review Score</Label>
                <Input
                  id="edit-score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  placeholder="8.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-reviewer">Reviewer/Publication</Label>
                <Input
                  id="edit-reviewer"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  required
                  placeholder="WKMUp, Variety, etc."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-externalUrl">External URL</Label>
              <Input
                id="edit-externalUrl"
                type="url"
                value={formData.externalUrl}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="edit-reviewImage">Review Image (Cloudinary ID)</Label>
              <Input
                id="edit-reviewImage"
                value={formData.reviewImage}
                onChange={(e) => setFormData({ ...formData, reviewImage: e.target.value })}
                placeholder="nollywood-film-club/review-image"
              />
            </div>

            <div>
              <Label htmlFor="edit-publishedAt">Published Date</Label>
              <Input
                id="edit-publishedAt"
                type="date"
                value={formData.publishedAt}
                onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Review</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

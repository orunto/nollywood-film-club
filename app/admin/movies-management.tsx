'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Star, Play, Mic } from 'lucide-react';
import { Content } from '@/lib/server-queries';

// interface MoviesManagementProps {}

export default function MoviesManagement() {
  const [movies, setMovies] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Content | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contentType: 'movie' as 'movie' | 'tv_show',
    runtime: '',
    releaseDate: '',
    rating: '',
    synopsis: '',
    genre: '',
    posterImage: '',
    trailerUrl: '',
    streamingUrl: '',
    streamingPlatform: '',
    otherPlatform: '',
    spaceUrl: '',
    podcastLinks: '',
    isMovieOfTheWeek: false,
  });
  
  const formatDate = (date: string | Date | null): string => {
    if (!date) return '';
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/admin/movies');
      const data = await response.json();
      if (data.success) {
        setMovies(data.data);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const movieData = {
        ...formData,
        runtime: formData.runtime ? parseInt(formData.runtime) : null,
        releaseDate: formData.releaseDate ? formatDate(formData.releaseDate) : null,
        genre: formData.genre ? formData.genre.split(',').map(g => g.trim()) : [],
        podcastLinks: formData.podcastLinks ? formData.podcastLinks.split(',').map(p => p.trim()) : [],
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
        await fetchMovies();
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingMovie(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving movie:', error);
    }
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
      trailerUrl: movie.trailerUrl || '',
      streamingUrl: movie.streamingUrl || '',
      streamingPlatform: movie.streamingPlatform || '',
      otherPlatform: movie.otherPlatform || '',
      spaceUrl: movie.spaceUrl || '',
      podcastLinks: movie.podcastLinks?.join(', ') || '',
      isMovieOfTheWeek: movie.isMovieOfTheWeek,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this movie?')) {
      try {
        const response = await fetch(`/api/admin/movies/${id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          await fetchMovies();
        }
      } catch (error) {
        console.error('Error deleting movie:', error);
      }
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
      }
    } catch (error) {
      console.error('Error updating movie of the week:', error);
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
      trailerUrl: '',
      streamingUrl: '',
      streamingPlatform: '',
      otherPlatform: '',
      spaceUrl: '',
      podcastLinks: '',
      isMovieOfTheWeek: false,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading movies...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Movies Management</h2>
          <p className="text-gray-600">Manage movies and TV shows</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Movie</DialogTitle>
              <DialogDescription>
                Add a new movie or TV show to the database
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select
                    value={formData.contentType}
                    onValueChange={(value: 'movie' | 'tv_show') => setFormData({ ...formData, contentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="tv_show">TV Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="runtime">Runtime (minutes)</Label>
                  <Input
                    id="runtime"
                    type="number"
                    value={formData.runtime}
                    onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input
                    id="releaseDate"
                    type="date"
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
                    <SelectTrigger>
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
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Comedy, Drama, Action"
                />
              </div>

              <div>
                <Label htmlFor="synopsis">Synopsis</Label>
                <Textarea
                  id="synopsis"
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="posterImage">Poster Image (Cloudinary ID)</Label>
                <Input
                  id="posterImage"
                  value={formData.posterImage}
                  onChange={(e) => setFormData({ ...formData, posterImage: e.target.value })}
                  placeholder="nollywood-film-club/movie-poster"
                />
              </div>

              <div>
                <Label htmlFor="trailerUrl">Trailer URL (YouTube embed)</Label>
                <Input
                  id="trailerUrl"
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="netflix">Netflix</SelectItem>
                      <SelectItem value="prime_video">Prime Video</SelectItem>
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
                    value={formData.streamingUrl}
                    onChange={(e) => setFormData({ ...formData, streamingUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {formData.streamingPlatform === 'other' && (
                <div>
                  <Label htmlFor="otherPlatform">Other Platform Name</Label>
                  <Input
                    id="otherPlatform"
                    value={formData.otherPlatform}
                    onChange={(e) => setFormData({ ...formData, otherPlatform: e.target.value })}
                    placeholder="Platform name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="spaceUrl">Twitter/X Space URL</Label>
                <Input
                  id="spaceUrl"
                  value={formData.spaceUrl}
                  onChange={(e) => setFormData({ ...formData, spaceUrl: e.target.value })}
                  placeholder="https://x.com/i/spaces/..."
                />
              </div>

              <div>
                <Label htmlFor="podcastLinks">Podcast Links (comma-separated)</Label>
                <Input
                  id="podcastLinks"
                  value={formData.podcastLinks}
                  onChange={(e) => setFormData({ ...formData, podcastLinks: e.target.value })}
                  placeholder="https://spotify.com/..., https://apple.com/..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isMovieOfTheWeek"
                  checked={formData.isMovieOfTheWeek}
                  onCheckedChange={(checked) => setFormData({ ...formData, isMovieOfTheWeek: checked })}
                />
                <Label htmlFor="isMovieOfTheWeek">Movie of the Week</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Movie</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {movies.map((movie) => (
          <Card key={movie.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {movie.title}
                    <Badge variant={movie.contentType === 'movie' ? 'default' : 'secondary'}>
                      {movie.contentType === 'movie' ? 'Movie' : 'TV Show'}
                    </Badge>
                    {movie.isMovieOfTheWeek && (
                      <Badge className="bg-yellow-500 text-black">
                        <Star className="w-3 h-3 mr-1" />
                        Movie of the Week
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {movie.rating && <span className="mr-4">Rating: {movie.rating}</span>}
                    {movie.runtime && <span className="mr-4">Runtime: {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
                    {movie.releaseDate && <span>Released: {new Date(movie.releaseDate).getFullYear()}</span>}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMovieOfTheWeek(movie.id, movie.isMovieOfTheWeek)}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    {movie.isMovieOfTheWeek ? 'Remove from MOTW' : 'Set as MOTW'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(movie)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(movie.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movie.synopsis && (
                  <p className="text-sm text-gray-600 line-clamp-2">{movie.synopsis}</p>
                )}
                {movie.genre && movie.genre.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {movie.genre.map((g, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {g}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {movie.streamingUrl && (
                    <span className="flex items-center">
                      <Play className="w-3 h-3 mr-1" />
                      Available to stream
                    </span>
                  )}
                  {movie.spaceUrl && (
                    <span className="flex items-center">
                      <Mic className="w-3 h-3 mr-1" />
                      Has Space
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Movie</DialogTitle>
            <DialogDescription>
              Update movie information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form fields as add dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-contentType">Content Type</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(value: 'movie' | 'tv_show') => setFormData({ ...formData, contentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="tv_show">TV Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-runtime">Runtime (minutes)</Label>
                <Input
                  id="edit-runtime"
                  type="number"
                  value={formData.runtime}
                  onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-releaseDate">Release Date</Label>
                <Input
                  id="edit-releaseDate"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-rating">Rating</Label>
                <Select
                  value={formData.rating}
                  onValueChange={(value) => setFormData({ ...formData, rating: value })}
                >
                  <SelectTrigger>
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
              <Label htmlFor="edit-genre">Genres (comma-separated)</Label>
              <Input
                id="edit-genre"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="Comedy, Drama, Action"
              />
            </div>

            <div>
              <Label htmlFor="edit-synopsis">Synopsis</Label>
              <Textarea
                id="edit-synopsis"
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-posterImage">Poster Image (Cloudinary ID)</Label>
              <Input
                id="edit-posterImage"
                value={formData.posterImage}
                onChange={(e) => setFormData({ ...formData, posterImage: e.target.value })}
                placeholder="nollywood-film-club/movie-poster"
              />
            </div>

            <div>
              <Label htmlFor="edit-trailerUrl">Trailer URL (YouTube embed)</Label>
              <Input
                id="edit-trailerUrl"
                value={formData.trailerUrl}
                onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                placeholder="https://www.youtube.com/embed/VIDEO_ID"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-streamingPlatform">Streaming Platform</Label>
                <Select
                  value={formData.streamingPlatform}
                  onValueChange={(value) => setFormData({ ...formData, streamingPlatform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="netflix">Netflix</SelectItem>
                    <SelectItem value="prime_video">Prime Video</SelectItem>
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
                <Label htmlFor="edit-streamingUrl">Streaming URL</Label>
                <Input
                  id="edit-streamingUrl"
                  value={formData.streamingUrl}
                  onChange={(e) => setFormData({ ...formData, streamingUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {formData.streamingPlatform === 'other' && (
              <div>
                <Label htmlFor="edit-otherPlatform">Other Platform Name</Label>
                <Input
                  id="edit-otherPlatform"
                  value={formData.otherPlatform}
                  onChange={(e) => setFormData({ ...formData, otherPlatform: e.target.value })}
                  placeholder="Platform name"
                />
              </div>
            )}

            <div>
              <Label htmlFor="edit-spaceUrl">Twitter/X Space URL</Label>
              <Input
                id="edit-spaceUrl"
                value={formData.spaceUrl}
                onChange={(e) => setFormData({ ...formData, spaceUrl: e.target.value })}
                placeholder="https://x.com/i/spaces/..."
              />
            </div>

            <div>
              <Label htmlFor="edit-podcastLinks">Podcast Links (comma-separated)</Label>
              <Input
                id="edit-podcastLinks"
                value={formData.podcastLinks}
                onChange={(e) => setFormData({ ...formData, podcastLinks: e.target.value })}
                placeholder="https://spotify.com/..., https://apple.com/..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isMovieOfTheWeek"
                checked={formData.isMovieOfTheWeek}
                onCheckedChange={(checked) => setFormData({ ...formData, isMovieOfTheWeek: checked })}
              />
              <Label htmlFor="edit-isMovieOfTheWeek">Movie of the Week</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Movie</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

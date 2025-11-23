"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Edit,
  Trash2,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Nav, Footer } from "@/components/custom";

interface User {
  id: string;
  email: string;
  clientMetadata?: {
    username?: string;
    role?: string;
  };
}

interface UserRating {
  id: string;
  contentId: string;
  userId: string;
  rating: number | null;
  review: string | null;
  createdAt: string;
  updatedAt: string;
  content?: {
    id: string;
    title: string;
    contentType: "movie" | "tv_show";
  };
}

interface UserDashboardProps {
  user: User;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [movies, setMovies] = useState<
    { id: string; title: string; contentType: "movie" | "tv_show" }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRating, setEditingRating] = useState<UserRating | null>(null);
  const [formData, setFormData] = useState({
    contentId: "",
    rating: "",
    review: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ratingsResponse, moviesResponse] = await Promise.all([
        fetch("/api/user/ratings"),
        fetch("/api/admin/movies"),
      ]);

      const ratingsData = await ratingsResponse.json();
      const moviesData = await moviesResponse.json();

      if (ratingsData.success) {
        setUserRatings(ratingsData.data);
      }
      if (moviesData.success) {
        setMovies(moviesData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ratingData = {
        ...formData,
        rating: formData.rating ? parseInt(formData.rating) : null,
      };

      const url = editingRating
        ? `/api/user/ratings/${editingRating.id}`
        : "/api/user/ratings";
      const method = editingRating ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ratingData),
      });

      const result = await response.json();
      if (result.success) {
        await fetchData();
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingRating(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error saving rating:", error);
    }
  };

  const handleEdit = (rating: UserRating) => {
    setEditingRating(rating);
    setFormData({
      contentId: rating.contentId,
      rating: rating.rating?.toString() || "",
      review: rating.review || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this rating?")) {
      try {
        const response = await fetch(`/api/user/ratings/${id}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          await fetchData();
        }
      } catch (error) {
        console.error("Error deleting rating:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      contentId: "",
      rating: "",
      review: "",
    });
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50">
          <div className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {(user.clientMetadata?.username || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user.clientMetadata?.username || "User"}
                    </h1>
                    <p className="text-gray-600">
                      {userRatings.length} movies reviewed
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Your Reviews</h2>
                  <p className="text-gray-600">
                    Rate and review movies and TV shows
                  </p>
                </div>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Review</DialogTitle>
                      <DialogDescription>
                        Rate and review a movie or TV show
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="contentId">Movie/TV Show</Label>
                        <Select
                          value={formData.contentId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, contentId: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select movie/TV show" />
                          </SelectTrigger>
                          <SelectContent>
                            {movies.map((movie) => (
                              <SelectItem key={movie.id} value={movie.id}>
                                {movie.title} (
                                {movie.contentType === "movie"
                                  ? "Movie"
                                  : "TV Show"}
                                )
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="rating">
                          How did you feel about it?
                        </Label>
                        <Select
                          value={formData.rating}
                          onValueChange={(value) =>
                            setFormData({ ...formData, rating: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your rating" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">
                              <div className="flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4" />I liked it (10
                                points)
                              </div>
                            </SelectItem>
                            <SelectItem value="5">
                              <div className="flex items-center gap-2">
                                <Minus className="w-4 h-4" />
                                It was okay (5 points)
                              </div>
                            </SelectItem>
                            <SelectItem value="0">
                              <div className="flex items-center gap-2">
                                <ThumbsDown className="w-4 h-4" />I didn&apos;t like
                                it (0 points)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="review">Review (Optional)</Label>
                        <Textarea
                          id="review"
                          value={formData.review}
                          onChange={(e) =>
                            setFormData({ ...formData, review: e.target.value })
                          }
                          rows={4}
                          placeholder="Write your review here..."
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Add Review</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-500">
                        Loading your reviews...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {(user.clientMetadata?.username || user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.clientMetadata?.username || "User"}
                  </h1>
                  <p className="text-gray-600">
                    {userRatings.length} movies reviewed
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Your Reviews</h2>
                <p className="text-gray-600">
                  Rate and review movies and TV shows
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Review</DialogTitle>
                    <DialogDescription>
                      Rate and review a movie or TV show
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="contentId">Movie/TV Show</Label>
                      <Select
                        value={formData.contentId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, contentId: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select movie/TV show" />
                        </SelectTrigger>
                        <SelectContent>
                          {movies.map((movie) => (
                            <SelectItem key={movie.id} value={movie.id}>
                              {movie.title} (
                              {movie.contentType === "movie"
                                ? "Movie"
                                : "TV Show"}
                              )
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="rating">Rating (1-5)</Label>
                      <Select
                        value={formData.rating}
                        onValueChange={(value) =>
                          setFormData({ ...formData, rating: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Star</SelectItem>
                          <SelectItem value="2">2 Stars</SelectItem>
                          <SelectItem value="3">3 Stars</SelectItem>
                          <SelectItem value="4">4 Stars</SelectItem>
                          <SelectItem value="5">5 Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="review">Review (Optional)</Label>
                      <Textarea
                        id="review"
                        value={formData.review}
                        onChange={(e) =>
                          setFormData({ ...formData, review: e.target.value })
                        }
                        rows={4}
                        placeholder="Write your review here..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Add Review</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 grid-cols-2">
              {userRatings.map((rating) => {
                const movie = movies.find((m) => m.id === rating.contentId);
                return (
                  <Card className="shadow-none bg-gray-50 rounded-sm" key={rating.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {movie?.title || "Unknown Movie"}
                            <Badge
                              variant={
                                movie?.contentType === "movie"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {movie?.contentType === "movie"
                                ? "Movie"
                                : "TV Show"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            <span>
                              Reviewed:{" "}
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(rating)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(rating.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {rating.review && (
                        <p className="text-sm text-gray-600">{rating.review}</p>
                      )}
                      <div className="flex items-center mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (rating.rating || 0)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {userRatings.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 mb-4">
                    You haven&apos;t reviewed any movies or TV shows yet.
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Review
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Review</DialogTitle>
                  <DialogDescription>
                    Update your rating and review
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-2">  
                    <Label htmlFor="edit-contentId">Movie/TV Show</Label>
                    <Select
                      value={formData.contentId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contentId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select movie/TV show" />
                      </SelectTrigger>
                      <SelectContent>
                        {movies.map((movie) => (
                          <SelectItem key={movie.id} value={movie.id}>
                            {movie.title} (
                            {movie.contentType === "movie" ? "Movie" : "TV Show"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
            
                  <div className="grid gap-2">
                    <Label htmlFor="edit-rating">How did you feel about it?</Label>
                    <Select
                      value={String(formData.rating)}
                      onValueChange={(value) =>
                        setFormData({ ...formData, rating: value })
                      }
                    >
                      <SelectTrigger id="edit-rating" className="w-full">
                        <SelectValue placeholder="Select a rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="w-4 h-4" />
                            I liked it (10 points)
                          </div>
                        </SelectItem>
                        <SelectItem value="5">
                          <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4" />
                            It was okay (5 points)
                          </div>
                        </SelectItem>
                        <SelectItem value="0">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="w-4 h-4" />
                            I didn&apos;t like it (0 points)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
            
                  <div className="grid gap-2">
                    <Label htmlFor="edit-review">Review (Optional)</Label>
                    <Textarea
                    className="focus-visible:ring-0 focus-visible:border-primary/50 h-50"
                      id="edit-review"
                      value={formData.review}
                      onChange={(e) =>
                        setFormData({ ...formData, review: e.target.value })
                      }
                      rows={4}
                      placeholder="Write your review here..."
                    />
                  </div>
            
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Update Review</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

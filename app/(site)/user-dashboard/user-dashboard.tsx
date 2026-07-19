"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, AccountSettings } from "@stackframe/stack";
import { toast } from "sonner";
import {
  PencilSimpleIcon,
  TrashIcon,
  FilmSlateIcon,
  SignOutIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyReviewsIllustration } from "@/components/graphics";
import { Footer } from "@/components/custom";
import RatingRadios from "@/components/custom/rating-radios";
import ScoreBox from "@/components/custom/score-box";
import MarkdownEditor from "@/components/custom/markdown-editor";
import ReviewText from "@/components/custom/review-text";
import { REVIEW_MAX } from "@/lib/reviews";
import { contentTypeLabel } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  profileImageUrl: string | null;
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
    contentType: "movie" | "tv_show" | "short_film";
  };
}

interface UserDashboardProps {
  user: User;
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;
const CONTENT_BASE: Record<"movie" | "tv_show" | "short_film", string> = {
  movie: "/movie",
  tv_show: "/tv",
  short_film: "/short",
};

// Link a review to its film by id — resolveContent() accepts the UUID and
// redirects to the canonical slug, so the list doesn't need the release year.
const filmHref = (content: NonNullable<UserRating["content"]>) =>
  `${CONTENT_BASE[content.contentType]}/${content.id}`;

const formatWhen = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function UserDashboard({ user }: UserDashboardProps) {
  const router = useRouter();
  const liveUser = useUser();

  const [tab, setTab] = useState("reviews");
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Edit review
  const [editingRating, setEditingRating] = useState<UserRating | null>(null);
  const [editForm, setEditForm] = useState<{ rating: number | null; review: string }>({
    rating: null,
    review: "",
  });
  const [savingReview, setSavingReview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRating | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Profile: display name
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  // Profile: username
  const [username, setUsername] = useState(user.username ?? "");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const debouncedUsername = useDebounce(username, 500);

  const loadRatings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/user/ratings");
      const data = await res.json();
      if (data.success) {
        setUserRatings(data.data);
      } else {
        setLoadError(true);
        toast.error(data.error || "Failed to load your reviews");
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
      setLoadError(true);
      toast.error("Failed to load your reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  // Live username availability — skips the check when unchanged or invalid so a
  // user keeping their own handle never sees it flagged as taken.
  useEffect(() => {
    const candidate = debouncedUsername.trim().toLowerCase();
    if (!candidate || candidate === (user.username ?? "") || !USERNAME_RE.test(candidate)) {
      setUsernameStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch("/api/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: candidate }),
        });
        const data = await res.json();
        if (!cancelled) {
          setUsernameStatus(res.ok ? data : { available: false, message: data.error || "Error checking username" });
        }
      } catch {
        if (!cancelled) setUsernameStatus({ available: false, message: "Error checking username" });
      } finally {
        if (!cancelled) setCheckingUsername(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, user.username]);

  const counts = {
    liked: userRatings.filter((r) => r.rating === 10).length,
    okay: userRatings.filter((r) => r.rating === 5).length,
    disliked: userRatings.filter((r) => r.rating === 0).length,
  };

  const handleEdit = (rating: UserRating) => {
    setEditingRating(rating);
    setEditForm({ rating: rating.rating, review: rating.review ?? "" });
  };

  const handleSaveReview = async () => {
    if (!editingRating) return;
    if (editForm.rating === null) {
      toast.error("Pick a rating first");
      return;
    }
    setSavingReview(true);
    try {
      const res = await fetch(`/api/user/ratings/${editingRating.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editForm.rating, review: editForm.review }),
      });
      const result = await res.json();
      if (result.success) {
        setUserRatings((prev) =>
          prev.map((r) =>
            r.id === editingRating.id
              ? { ...r, rating: editForm.rating, review: editForm.review.trim() || null }
              : r,
          ),
        );
        setEditingRating(null);
        toast.success(result.message || "Review updated");
      } else {
        toast.error(result.error || "Failed to update review");
      }
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to update review");
    } finally {
      setSavingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/user/ratings/${deleteTarget.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setUserRatings((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        toast.success("Review deleted");
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!liveUser) return;
    setSavingName(true);
    try {
      await liveUser.update({ displayName: displayName.trim() });
      toast.success("Display name updated");
      router.refresh();
    } catch (error) {
      console.error("Error updating display name:", error);
      toast.error("Failed to update display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    setSavingUsername(true);
    try {
      const res = await fetch("/api/create-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), stackUserId: user.id }),
      });
      if (res.ok) {
        toast.success("Username updated");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update username");
      }
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  const label = user.displayName || user.username || user.email || "Member";
  const initial = (user.username || user.email || "U").charAt(0).toUpperCase();

  const displayNameChanged = displayName.trim() !== (user.displayName ?? "");
  const usernameChanged = username.trim().toLowerCase() !== (user.username ?? "") && username.trim() !== "";
  const usernameValid = USERNAME_RE.test(username.trim());
  const canSaveUsername =
    usernameChanged && usernameValid && usernameStatus?.available === true && !checkingUsername && !savingUsername;

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Profile header — editorial black band, same language as the nav */}
        <header className="w-full bg-black text-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center lg:px-10">
            <Avatar className="size-16 border border-white/20">
              {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={label} />}
              <AvatarFallback className="bg-white text-xl font-medium text-black">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{label}</h1>
              {user.username && <p className="text-sm text-white/60">@{user.username}</p>}
              <p className="mt-1 text-xs text-white/40">{user.email}</p>
            </div>
            <dl className="flex gap-6">
              {[
                { n: userRatings.length, label: "reviews" },
                { n: counts.liked, label: "liked" },
                { n: counts.okay, label: "okay" },
                { n: counts.disliked, label: "disliked" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <dd className="text-2xl font-semibold">{stat.n}</dd>
                  <dt className="text-xs uppercase tracking-widest text-white/50">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* REVIEWS */}
            <TabsContent value="reviews">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Your Reviews</h2>
                  <p className="text-sm text-black/60">Everything you&apos;ve rated and reviewed.</p>
                </div>
                <Link href="/movies-and-tv">
                  <Button variant="outline">
                    <FilmSlateIcon className="h-4 w-4" />
                    Browse films to review
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-sm border border-black/10 p-10 text-sm text-black/50">
                  <CircleNotchIcon className="h-4 w-4 animate-spin" />
                  Loading your reviews...
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center gap-3 rounded-sm border border-black/10 p-10 text-center">
                  <p className="text-sm text-black/60">
                    We couldn&apos;t load your reviews.
                  </p>
                  <Button variant="outline" onClick={loadRatings}>
                    Try again
                  </Button>
                </div>
              ) : userRatings.length === 0 ? (
                <div className="flex flex-col items-center rounded-sm border border-black/10 p-10 text-center">
                  <EmptyReviewsIllustration className="mb-4 w-24 text-black/70 md:w-28" />
                  <p className="mb-4 text-sm text-black/60">
                    You haven&apos;t reviewed any movies or TV shows yet.
                  </p>
                  <Link href="/movies-and-tv">
                    <Button>
                      <FilmSlateIcon className="h-4 w-4" />
                      Browse films to review
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {userRatings.map((rating) => (
                    <article
                      key={rating.id}
                      className="flex flex-col gap-3 rounded-sm border border-black/10 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ScoreBox
                            score={rating.rating}
                            className="h-12 w-12 shrink-0 rounded-full text-lg"
                          />
                          <div>
                            {rating.content ? (
                              <Link
                                href={filmHref(rating.content)}
                                className="font-semibold leading-tight hover:underline"
                              >
                                {rating.content.title}
                              </Link>
                            ) : (
                              <span className="font-semibold leading-tight">Unknown title</span>
                            )}
                            <div className="text-xs uppercase tracking-widest text-black/50">
                              {rating.content ? contentTypeLabel(rating.content.contentType) : "—"}
                              {" · "}
                              {formatWhen(rating.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" aria-label="Edit" onClick={() => handleEdit(rating)}>
                            <PencilSimpleIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleteTarget(rating)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {rating.review && <ReviewText source={rating.review} />}
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PROFILE */}
            <TabsContent value="profile">
              <div className="max-w-xl space-y-8">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 border border-black/10">
                    {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={label} />}
                    <AvatarFallback className="bg-black text-xl font-medium text-white">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-black/60">
                    Your photo is managed in{" "}
                    <button
                      type="button"
                      className="underline hover:text-black"
                      onClick={() => setTab("settings")}
                    >
                      Settings
                    </button>
                    .
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Button
                    onClick={handleSaveDisplayName}
                    disabled={!displayNameChanged || savingName}
                    className="mt-1"
                  >
                    {savingName && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
                    Save name
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <CircleNotchIcon className="h-4 w-4 animate-spin text-black/40" />
                      ) : usernameStatus?.available === true ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" weight="fill" />
                      ) : usernameStatus?.available === false ? (
                        <XCircleIcon className="h-4 w-4 text-red-600" weight="fill" />
                      ) : null}
                    </div>
                  </div>
                  {username.trim() !== "" && usernameChanged && !usernameValid && (
                    <p className="text-sm text-red-600">
                      3–20 characters: letters, numbers, underscores, and hyphens only.
                    </p>
                  )}
                  {usernameValid && usernameChanged && usernameStatus && (
                    <p className={usernameStatus.available ? "text-sm text-green-600" : "text-sm text-red-600"}>
                      {usernameStatus.message}
                    </p>
                  )}
                  <p className="text-xs text-black/40">This is your unique handle across the club.</p>
                  <Button onClick={handleSaveUsername} disabled={!canSaveUsername} className="mt-1">
                    {savingUsername && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
                    Save username
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* SETTINGS */}
            <TabsContent value="settings">
              <div className="space-y-8">
                <AccountSettings fullPage={false} />
                <div className="border-t border-black/10 pt-6">
                  <Button variant="outline" onClick={() => liveUser?.signOut()}>
                    <SignOutIcon className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />

      {/* Edit review dialog */}
      <Dialog open={editingRating !== null} onOpenChange={(open) => !open && setEditingRating(null)}>
        <DialogContent className="rounded-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRating?.content ? `Edit your review of ${editingRating.content.title}` : "Edit review"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <RatingRadios
              value={editForm.rating}
              onChange={(rating) => setEditForm((f) => ({ ...f, rating }))}
              disabled={savingReview}
            />
            <div>
              <h3 className="mb-2 text-sm font-medium">Your Review (Optional)</h3>
              <MarkdownEditor
                value={editForm.review}
                onChange={(review) => setEditForm((f) => ({ ...f, review }))}
                disabled={savingReview}
                maxLength={REVIEW_MAX}
                placeholder="Share your thoughts about this movie..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRating(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReview} disabled={savingReview || editForm.rating === null}>
              {savingReview && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
              Update Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your rating{deleteTarget?.content ? ` of ${deleteTarget.content.title}` : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

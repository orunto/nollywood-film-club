import type { Route } from "./+types/admin.publishing";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { PlusIcon, PencilSimpleIcon, TrashIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { SortableHead, useTableSort, type SortAccessors } from "../../components/ui/table-sort";
import { contentTypeLabel, episodeLabel } from "../../lib/utils";
import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminSearchInput,
  LoadingRows,
  adminOutlineBadgeClass,
  inputClass,
  jsonResponse,
} from "../../components/admin/admin-ui";

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  const [posts, discussions, content, reviews] = await Promise.all([
    services.db.adminBlog.list(),
    services.db.adminDiscussions.list(),
    services.db.adminContent.list(),
    services.db.adminReviews.list(),
  ]);

  return {
    posts: posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt ?? null,
      slug: post.slug,
      published: post.published,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString().split("T")[0] : null,
    })),
    discussions: discussions.map((discussion) => ({
      id: discussion.id,
      title: discussion.title,
      description: discussion.description ?? null,
      contentId: discussion.contentId ?? null,
      spaceUrl: discussion.spaceUrl ?? null,
      podcastLinks: discussion.podcastLinks ?? [],
      episodeNumber: discussion.episodeNumber ?? null,
      discussionDate: discussion.discussionDate
        ? discussion.discussionDate.toISOString().split("T")[0]
        : null,
    })),
    content: content.map((item) => ({
      id: item.id,
      title: item.title,
      contentType: item.contentType,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      contentId: review.contentId,
      title: review.title,
      description: review.description,
      score: review.scoreTenths !== null ? review.scoreTenths / 10 : null,
      reviewer: review.reviewer,
      externalUrl: review.externalUrl ?? null,
      reviewImage: review.legacyReviewImage ?? null,
      publishedAt: review.publishedAt ? review.publishedAt.toISOString().split("T")[0] : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Shared form helpers
// ---------------------------------------------------------------------------

const fieldClass = "flex flex-col gap-2";
const NO_CONTENT = "none";

interface ContentOption {
  id: string;
  title: string;
  contentType: "movie" | "tv_show" | "short_film";
}

function ContentPicker({
  value,
  onChange,
  options,
  placeholder = "Select movie/TV show",
}: {
  value: string;
  onChange: (value: string) => void;
  options: ContentOption[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={inputClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.title} ({contentTypeLabel(item.contentType)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Blog Posts
// ---------------------------------------------------------------------------

interface BlogRow {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  published: boolean;
  publishedAt: string | null;
}

function BlogPostsSection({ initial }: { initial: BlogRow[] }) {
  const [posts, setPosts] = useState<BlogRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogRow | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    slug: "",
    published: false,
    publishedAt: "",
  });

  useEffect(() => {
    setPosts(initial);
  }, [initial]);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/admin/blog-posts");
      const data = await jsonResponse<BlogRow[]>(response);
      if (data.success) {
        setPosts(
          (data.data ?? []).map((post: BlogRow) => ({
            ...post,
            publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().split("T")[0] : null,
          })),
        );
      } else toast.error("Failed to load blog posts");
    } catch {
      toast.error("Failed to load blog posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const postData = {
        ...formData,
        publishedAt: formData.published && formData.publishedAt ? formData.publishedAt : null,
      };
      const url = editingPost ? `/api/admin/blog-posts/${editingPost.id}` : "/api/admin/blog-posts";
      const method = editingPost ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchPosts();
        toast.success(`Blog post ${editingPost ? "updated" : "added"} successfully`);
        setIsFormOpen(false);
        setEditingPost(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingPost ? "update" : "add"} blog post`);
      }
    } catch {
      toast.error(`Failed to ${editingPost ? "update" : "add"} blog post. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingPost(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (post: BlogRow) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt ?? "",
      slug: post.slug,
      published: post.published,
      publishedAt: post.publishedAt ?? "",
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/blog-posts/${isDeleting}`, { method: "DELETE" });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchPosts();
        toast.success("Blog post deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete blog post");
      }
    } catch {
      toast.error("Failed to delete blog post. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const togglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/admin/blog-posts/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          published: !currentPublished,
          publishedAt: !currentPublished ? new Date().toISOString().split("T")[0] : null,
        }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchPosts();
        toast.success(currentPublished ? "Blog post unpublished" : "Blog post published");
      } else {
        toast.error(result.error || "Failed to update publish status");
      }
    } catch {
      toast.error("Failed to update publish status. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      excerpt: "",
      slug: "",
      published: false,
      publishedAt: "",
    });
  };

  const filtered = posts.filter((p) => p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const postBeingDeleted = posts.find((p) => p.id === isDeleting);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by title…" />
        <Button onClick={handleAdd} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Blog Post
        </Button>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={searchQuery.trim() !== ""}
          title="No blog posts yet"
          message={
            searchQuery
              ? `No blog posts match "${searchQuery}".`
              : 'No blog posts yet. Click "Add Blog Post" to create one.'
          }
        />
      ) : (
        <AdminCard className="divide-y divide-black/10">
          {filtered.map((post) => (
            <div key={post.id} className="flex items-center justify-between gap-4 p-3 transition-colors hover:bg-black/5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{post.title}</span>
                  <Badge className={`${post.published ? adminOutlineBadgeClass : "rounded-sm border border-black/30 bg-transparent text-[11px] font-semibold uppercase tracking-wide text-black/50"}`}>
                    {post.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="truncate text-xs font-light text-black/60">
                  Slug: {post.slug}
                  {post.publishedAt && <> · Published {post.publishedAt}</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-black/60 hover:bg-black/10 hover:text-black"
                  onClick={() => togglePublish(post.id, post.published)}
                >
                  {post.published ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => handleEdit(post)}>
                  <PencilSimpleIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => setIsDeleting(post.id)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </AdminCard>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingPost ? "Edit Blog Post" : "Add New Blog Post"}</SheetTitle>
            <SheetDescription>
              {editingPost ? "Update blog post information" : "Create a new blog post or article"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className={fieldClass}>
                <Label htmlFor="blog-title">Title</Label>
                <Input id="blog-title" className={inputClass} value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="blog-slug">Slug</Label>
                <Input id="blog-slug" className={inputClass} value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="blog-excerpt">Excerpt</Label>
                <Textarea id="blog-excerpt" className={inputClass} value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={3} placeholder="Brief description of the blog post..." />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="blog-content">Content</Label>
                <Textarea id="blog-content" className={inputClass} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={12} placeholder="Write your blog post content here..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="blog-publishedAt">Publish Date</Label>
                  <Input id="blog-publishedAt" type="date" className={inputClass} value={formData.publishedAt} onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="blog-published" checked={formData.published} onCheckedChange={(checked) => setFormData({ ...formData, published: checked === true })} />
                  <Label htmlFor="blog-published">Published</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="rounded-sm border-black text-black shadow-none hover:bg-black hover:text-white" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
                {isSubmitting ? "Saving…" : editingPost ? "Update Blog Post" : "Add Blog Post"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleting !== null} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;{postBeingDeleted?.title}&quot;.
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
// Discussions
// ---------------------------------------------------------------------------

interface DiscussionRow {
  id: string;
  title: string;
  description: string | null;
  contentId: string | null;
  spaceUrl: string | null;
  podcastLinks: string[];
  episodeNumber: number | null;
  discussionDate: string | null;
}

function DiscussionsSection({ initial, content }: { initial: DiscussionRow[]; content: ContentOption[] }) {
  const [discussions, setDiscussions] = useState<DiscussionRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<DiscussionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contentId: NO_CONTENT,
    spaceUrl: "",
    podcastLinks: "",
    episodeNumber: "",
    discussionDate: "",
  });

  useEffect(() => {
    setDiscussions(initial);
  }, [initial]);

  const fetchDiscussions = async () => {
    try {
      const response = await fetch("/api/admin/discussions");
      const data = await jsonResponse<DiscussionRow[]>(response);
      if (data.success) {
        setDiscussions(
          (data.data ?? []).map((discussion: DiscussionRow) => ({
            ...discussion,
            discussionDate: discussion.discussionDate
              ? new Date(discussion.discussionDate).toISOString().split("T")[0]
              : null,
          })),
        );
      } else toast.error("Failed to load discussions");
    } catch {
      toast.error("Failed to load discussions. Please try again.");
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
          ? formData.podcastLinks.split("\n").map((l) => l.trim()).filter(Boolean)
          : [],
        episodeNumber: formData.episodeNumber !== "" ? parseInt(formData.episodeNumber, 10) : null,
        discussionDate: formData.discussionDate || null,
      };
      const url = editingDiscussion ? `/api/admin/discussions/${editingDiscussion.id}` : "/api/admin/discussions";
      const method = editingDiscussion ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discussionData),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchDiscussions();
        toast.success(`Discussion ${editingDiscussion ? "updated" : "added"} successfully`);
        setIsFormOpen(false);
        setEditingDiscussion(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingDiscussion ? "update" : "add"} discussion`);
      }
    } catch {
      toast.error(`Failed to ${editingDiscussion ? "update" : "add"} discussion. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingDiscussion(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (discussion: DiscussionRow) => {
    setEditingDiscussion(discussion);
    setFormData({
      title: discussion.title,
      description: discussion.description ?? "",
      contentId: discussion.contentId ?? NO_CONTENT,
      spaceUrl: discussion.spaceUrl ?? "",
      podcastLinks: discussion.podcastLinks.join("\n"),
      episodeNumber: discussion.episodeNumber?.toString() ?? "",
      discussionDate: discussion.discussionDate ?? "",
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/discussions/${isDeleting}`, { method: "DELETE" });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchDiscussions();
        toast.success("Discussion deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete discussion");
      }
    } catch {
      toast.error("Failed to delete discussion. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      contentId: NO_CONTENT,
      spaceUrl: "",
      podcastLinks: "",
      episodeNumber: "",
      discussionDate: "",
    });
  };

  const contentTitleById = new Map(content.map((c) => [c.id, c.title]));
  const sortAccessors: SortAccessors<DiscussionRow> = {
    sn: (d) => d.episodeNumber,
    title: (d) => d.title,
    content: (d) => (d.contentId ? contentTitleById.get(d.contentId) ?? null : null),
    date: (d) => (d.discussionDate ? new Date(d.discussionDate) : null),
    links: (d) => (d.spaceUrl ? 1 : 0) + (d.podcastLinks?.length ?? 0),
  };

  const filtered = discussions.filter((d) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const contentTitle = d.contentId ? contentTitleById.get(d.contentId) ?? "" : "";
    return d.title.toLowerCase().includes(q) || contentTitle.toLowerCase().includes(q);
  });
  const discussionBeingDeleted = discussions.find((d) => d.id === isDeleting);
  const { sorted, sortKey, direction, toggleSort } = useTableSort(filtered, sortAccessors);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by title or content…" />
        <Button onClick={handleAdd} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Discussion
        </Button>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={searchQuery.trim() !== ""}
          title="No discussions yet"
          message={
            searchQuery
              ? `No discussions match "${searchQuery}".`
              : 'No discussions yet. Click "Add Discussion" to create one.'
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="S/N" sortKey="sn" activeKey={sortKey} direction={direction} onSort={toggleSort} className="w-16" />
                <SortableHead label="Title" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Content" sortKey="content" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Date" sortKey="date" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Links" sortKey="links" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((discussion) => {
                const contentTitle = discussion.contentId
                  ? contentTitleById.get(discussion.contentId)
                  : null;
                const podcastCount = discussion.podcastLinks?.length ?? 0;
                return (
                  <TableRow key={discussion.id} className="border-black/10 hover:bg-black/5">
                    <TableCell className="text-black/60">{discussion.episodeNumber ?? "—"}</TableCell>
                    <TableCell className="whitespace-normal font-medium">
                      {episodeLabel(discussion.episodeNumber, discussion.title)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {contentTitle ? (
                        <span className="text-black/60">{contentTitle}</span>
                      ) : (
                        <Badge className={adminOutlineBadgeClass}>Standalone</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-black/60">
                      {discussion.discussionDate ?? "—"}
                    </TableCell>
                    <TableCell className="text-black/60">
                      {discussion.spaceUrl || podcastCount > 0 ? (
                        <span>
                          {discussion.spaceUrl && "Space"}
                          {discussion.spaceUrl && podcastCount > 0 && " · "}
                          {podcastCount > 0 && `${podcastCount} podcast ${podcastCount === 1 ? "link" : "links"}`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {discussion.spaceUrl && (
                          <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" asChild>
                            <a href={discussion.spaceUrl} target="_blank" rel="noopener noreferrer" title="Open space">
                              <ArrowSquareOutIcon className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => handleEdit(discussion)}>
                          <PencilSimpleIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => setIsDeleting(discussion.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminCard>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingDiscussion ? "Edit Discussion" : "Add New Discussion"}</SheetTitle>
            <SheetDescription>
              {editingDiscussion ? "Update discussion information" : "Add a new discussion space or podcast episode"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className={fieldClass}>
                <Label htmlFor="disc-title">Title</Label>
                <Input id="disc-title" className={inputClass} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="disc-contentId">Movie/TV Show (optional)</Label>
                <ContentPicker
                  value={formData.contentId}
                  onChange={(value) => setFormData({ ...formData, contentId: value })}
                  options={content}
                  placeholder="None (standalone topic)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="disc-episodeNumber">S/N (Episode Number)</Label>
                  <Input id="disc-episodeNumber" type="number" className={inputClass} value={formData.episodeNumber} onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })} placeholder="0 for intro" />
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="disc-discussionDate">Discussion Date</Label>
                  <Input id="disc-discussionDate" type="date" className={inputClass} value={formData.discussionDate} onChange={(e) => setFormData({ ...formData, discussionDate: e.target.value })} />
                </div>
              </div>
              <div className={fieldClass}>
                <Label htmlFor="disc-description">Description</Label>
                <Textarea id="disc-description" className={inputClass} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="disc-spaceUrl">Space URL (Twitter/X)</Label>
                <Input id="disc-spaceUrl" type="url" className={inputClass} value={formData.spaceUrl} onChange={(e) => setFormData({ ...formData, spaceUrl: e.target.value })} placeholder="https://x.com/i/spaces/..." />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="disc-podcastLinks">Podcast Links (one per line)</Label>
                <Textarea id="disc-podcastLinks" className={inputClass} value={formData.podcastLinks} onChange={(e) => setFormData({ ...formData, podcastLinks: e.target.value })} rows={3} placeholder={"https://open.spotify.com/episode/...\nhttps://music.youtube.com/..."} />
              </div>
            </div>
            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="rounded-sm border-black text-black shadow-none hover:bg-black hover:text-white" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
                {isSubmitting ? "Saving…" : editingDiscussion ? "Update Discussion" : "Add Discussion"}
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

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

interface ReviewRow {
  id: string;
  contentId: string;
  title: string;
  description: string;
  score: number | null;
  reviewer: string;
  externalUrl: string | null;
  reviewImage: string | null;
  publishedAt: string | null;
}

function ReviewsSection({ initial, content }: { initial: ReviewRow[]; content: ContentOption[] }) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contentId: "",
    title: "",
    description: "",
    score: "",
    reviewer: "",
    externalUrl: "",
    reviewImage: "",
    publishedAt: "",
  });

  useEffect(() => {
    setReviews(initial);
  }, [initial]);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/admin/reviews");
      const data = await jsonResponse<ReviewRow[]>(response);
      if (data.success) {
        setReviews(
          (data.data ?? []).map((review: ReviewRow & { scoreTenths?: number | null }) => ({
            id: review.id,
            contentId: review.contentId,
            title: review.title,
            description: review.description,
            score: review.score ?? (review.scoreTenths !== undefined && review.scoreTenths !== null ? review.scoreTenths / 10 : null),
            reviewer: review.reviewer,
            externalUrl: review.externalUrl ?? null,
            reviewImage: review.reviewImage ?? null,
            publishedAt: review.publishedAt ? new Date(review.publishedAt).toISOString().split("T")[0] : null,
          })),
        );
      } else toast.error("Failed to load reviews");
    } catch {
      toast.error("Failed to load reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const reviewData = {
        contentId: formData.contentId,
        title: formData.title,
        description: formData.description,
        score: formData.score ? parseFloat(formData.score) : null,
        reviewer: formData.reviewer,
        externalUrl: formData.externalUrl || null,
        reviewImage: formData.reviewImage || null,
        publishedAt: formData.publishedAt || null,
      };
      const url = editingReview ? `/api/admin/reviews/${editingReview.id}` : "/api/admin/reviews";
      const method = editingReview ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchReviews();
        toast.success(`Review ${editingReview ? "updated" : "added"} successfully`);
        setIsFormOpen(false);
        setEditingReview(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingReview ? "update" : "add"} review`);
      }
    } catch {
      toast.error(`Failed to ${editingReview ? "update" : "add"} review. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingReview(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (review: ReviewRow) => {
    setEditingReview(review);
    setFormData({
      contentId: review.contentId,
      title: review.title,
      description: review.description,
      score: review.score?.toString() ?? "",
      reviewer: review.reviewer,
      externalUrl: review.externalUrl ?? "",
      reviewImage: review.reviewImage ?? "",
      publishedAt: review.publishedAt ?? "",
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/reviews/${isDeleting}`, { method: "DELETE" });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchReviews();
        toast.success("Review deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    } catch {
      toast.error("Failed to delete review. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setFormData({
      contentId: "",
      title: "",
      description: "",
      score: "",
      reviewer: "",
      externalUrl: "",
      reviewImage: "",
      publishedAt: "",
    });
  };

  const contentTitleById = new Map(content.map((c) => [c.id, c.title]));
  const filtered = reviews.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const movieTitle = contentTitleById.get(r.contentId) ?? "";
    return r.title.toLowerCase().includes(q) || movieTitle.toLowerCase().includes(q);
  });
  const reviewBeingDeleted = reviews.find((r) => r.id === isDeleting);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by title…" />
        <Button onClick={handleAdd} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Review
        </Button>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={searchQuery.trim() !== ""}
          title="No reviews yet"
          message={
            searchQuery
              ? `No reviews match "${searchQuery}".`
              : 'No reviews yet. Click "Add Review" to create one.'
          }
        />
      ) : (
        <AdminCard className="divide-y divide-black/10">
          {filtered.map((review) => {
            const movie = contentTitleById.get(review.contentId);
            return (
              <div key={review.id} className="flex items-center justify-between gap-4 p-3 transition-colors hover:bg-black/5">
                <div className="min-w-0 flex-1">
                  <span className="truncate font-medium">{review.title}</span>
                  <p className="truncate text-xs font-light text-black/60">
                    By {review.reviewer}
                    {movie && <> · For {movie}</>}
                    {review.score !== null && <> · Score {review.score}/10</>}
                    {review.publishedAt && <> · Published {review.publishedAt}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {review.externalUrl && (
                    <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" asChild>
                      <a href={review.externalUrl} target="_blank" rel="noopener noreferrer">
                        <ArrowSquareOutIcon className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => handleEdit(review)}>
                    <PencilSimpleIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-black/60 hover:bg-black/10 hover:text-black" onClick={() => setIsDeleting(review.id)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </AdminCard>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingReview ? "Edit Review" : "Add New Review"}</SheetTitle>
            <SheetDescription>
              {editingReview ? "Update review information" : "Add a new external review or blog post"}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className={fieldClass}>
                <Label htmlFor="rev-contentId">Movie/TV Show</Label>
                <ContentPicker value={formData.contentId} onChange={(value) => setFormData({ ...formData, contentId: value })} options={content} />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="rev-title">Review Title</Label>
                <Input id="rev-title" className={inputClass} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="rev-description">Review Description/Snippet</Label>
                <Textarea id="rev-description" className={inputClass} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <Label htmlFor="rev-score">Review Score</Label>
                  <Input id="rev-score" type="number" step="0.1" min="0" max="10" className={inputClass} value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} placeholder="8.5" />
                </div>
                <div className={fieldClass}>
                  <Label htmlFor="rev-reviewer">Reviewer/Publication</Label>
                  <Input id="rev-reviewer" className={inputClass} value={formData.reviewer} onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })} required placeholder="WKMUp, Variety, etc." />
                </div>
              </div>
              <div className={fieldClass}>
                <Label htmlFor="rev-externalUrl">External URL</Label>
                <Input id="rev-externalUrl" type="url" className={inputClass} value={formData.externalUrl} onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="rev-publishedAt">Published Date</Label>
                <Input id="rev-publishedAt" type="date" className={inputClass} value={formData.publishedAt} onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })} />
              </div>
            </div>
            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="rounded-sm border-black text-black shadow-none hover:bg-black hover:text-white" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-sm bg-black text-white shadow-none hover:bg-black/80">
                {isSubmitting ? "Saving…" : editingReview ? "Update Review" : "Add Review"}
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

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export default function AdminPublishingRoute() {
  const { posts, discussions, content, reviews } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Publishing"
        title="What the club puts out"
        description="Blog posts, discussion episodes, and the external reviews the club recommends."
      />

      <Tabs defaultValue="blog" className="gap-0">
        <TabsList className="h-auto w-fit gap-1 rounded-sm border border-black/10 bg-transparent p-1">
          <TabsTrigger
            value="blog"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Blog Posts
          </TabsTrigger>
          <TabsTrigger
            value="discussions"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Discussions
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog" className="mt-4">
          <BlogPostsSection initial={posts} />
        </TabsContent>
        <TabsContent value="discussions" className="mt-4">
          <DiscussionsSection initial={discussions} content={content} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsSection initial={reviews} content={content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
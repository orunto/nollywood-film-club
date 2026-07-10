'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BlogPostsManagement() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    published: false,
    publishedAt: '',
  });

  useEffect(() => {
    fetchBlogPosts(true);
  }, []);

  const fetchBlogPosts = async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/blog-posts');
      const data = await response.json();
      if (data.success) {
        setBlogPosts(data.data);
      } else if (isInitial) {
        toast.error('Failed to load blog posts');
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      if (isInitial) toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const postData = {
        ...formData,
        publishedAt: formData.published && formData.publishedAt ? new Date(formData.publishedAt) : null,
      };

      const url = editingPost ? `/api/admin/blog-posts/${editingPost.id}` : '/api/admin/blog-posts';
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const result = await response.json();
      if (result.success) {
        await fetchBlogPosts();
        toast.success(`Blog post ${editingPost ? 'updated' : 'added'} successfully`);
        setIsFormOpen(false);
        setEditingPost(null);
        resetForm();
      } else {
        toast.error(result.error || `Failed to ${editingPost ? 'update' : 'add'} blog post`);
      }
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.error(`Failed to ${editingPost ? 'update' : 'add'} blog post. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingPost(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      slug: post.slug,
      published: post.published,
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().split('T')[0] : '',
    });
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      const response = await fetch(`/api/admin/blog-posts/${isDeleting}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await fetchBlogPosts();
        toast.success('Blog post deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete blog post');
      }
    } catch (error) {
      console.error('Error deleting blog post:', error);
      toast.error('Failed to delete blog post. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const togglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/admin/blog-posts/${id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          published: !currentPublished,
          publishedAt: !currentPublished ? new Date() : null
        }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchBlogPosts();
        toast.success(currentPublished ? 'Blog post unpublished' : 'Blog post published');
      } else {
        toast.error(result.error || 'Failed to update publish status');
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast.error('Failed to update publish status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      slug: '',
      published: false,
      publishedAt: '',
    });
  };

  const filteredPosts = blogPosts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const postBeingDeleted = blogPosts.find((p) => p.id === isDeleting);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Blog Posts Management</h2>
          <p className="text-sm font-light text-black/60">Manage blog posts and articles</p>
        </div>
        <Button onClick={handleAdd} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
          <Plus className="w-4 h-4 mr-2" />
          Add Blog Post
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
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matches found' : 'Coming Soon...'}
          </h2>
          <p className="text-gray-600 text-sm">
            {searchQuery
              ? `No blog posts match "${searchQuery}".`
              : 'No blog posts yet. Click "Add Blog Post" to create one.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm divide-y divide-black/10">
          {filteredPosts.map((post) => (
            <div key={post.id} className="flex items-center justify-between gap-4 p-3 hover:bg-black/5 transition-colors group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{post.title}</span>
                  <Badge
                    className={`text-xs rounded-sm bg-transparent border ${post.published ? 'border-black text-black' : 'border-black/30 text-black/50'}`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-xs font-light text-black/60 truncate">
                  Slug: {post.slug}
                  {post.publishedAt && <> · Published {new Date(post.publishedAt).toLocaleDateString()}</>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-black/60 hover:text-black hover:bg-black/10"
                  onClick={() => togglePublish(post.id, post.published)}
                >
                  {post.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => handleEdit(post)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/10" onClick={() => setIsDeleting(post.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0 rounded-none shadow-none">
          <SheetHeader>
            <SheetTitle>{editingPost ? 'Edit Blog Post' : 'Add New Blog Post'}</SheetTitle>
            <SheetDescription>
              {editingPost ? 'Update blog post information' : 'Create a new blog post or article'}
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
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  className={inputClass}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  className={inputClass}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  placeholder="Brief description of the blog post..."
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  className={inputClass}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  placeholder="Write your blog post content here..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="publishedAt">Publish Date</Label>
                  <Input
                    id="publishedAt"
                    type="date"
                    className={inputClass}
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
              </div>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-black/10">
              <Button type="button" variant="outline" className="border-black text-black bg-transparent hover:bg-black hover:text-white rounded-sm shadow-none" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-black/80 rounded-sm shadow-none">
                {isSubmitting ? 'Saving…' : editingPost ? 'Update Blog Post' : 'Add Blog Post'}
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

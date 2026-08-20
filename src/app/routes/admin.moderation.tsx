import type { Route } from "./+types/admin.moderation";
import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CheckIcon, XIcon, FlagIcon, EyeIcon, EyeSlashIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { SortableHead, useTableSort, type SortAccessors } from "../../components/ui/table-sort";
import { REPORT_REASONS } from "../../lib/comments";
import { CONTACT_CATEGORIES } from "../../lib/contact";
import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminSearchInput,
  LoadingRows,
  adminBadgeClass,
  adminOutlineBadgeClass,
  adminMutedBadgeClass,
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

  const [reports, ratings, comments, contacts] = await Promise.all([
    services.db.adminReports.list(),
    services.db.adminModeration.listRatings(),
    services.db.adminModeration.listComments(),
    services.db.contacts.listForAdmin(),
  ]);

  return {
    reports,
    ratings: ratings.map(({ rating, user, film }) => ({
      id: rating.id,
      contentTitle: film?.title ?? "Unlinked content",
      username: user?.username ?? user?.name ?? null,
      rating: rating.rating,
      review: rating.review ?? null,
      flagged: rating.flagged,
      restricted: rating.restricted,
      createdAt: rating.createdAt.toISOString(),
    })),
    comments: comments.map(({ comment, user }) => ({
      id: comment.id,
      reviewId: comment.reviewId,
      body: comment.body,
      username: user?.username ?? user?.name ?? null,
      flagged: comment.flagged,
      restricted: comment.restricted,
      createdAt: comment.createdAt.toISOString(),
    })),
    contacts: contacts.map((message) => ({
      id: message.id,
      category: message.category,
      message: message.message,
      email: message.email ?? null,
      userId: message.userId,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CONTACT_CATEGORIES.map((c) => [c.value, c.label]),
);
const RATING_LABELS: Record<number, string> = {
  10: "Liked it",
  5: "It was okay",
  0: "Didn't like it",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadges({ status }: { status: string }) {
  if (status === "open") return <Badge className={adminBadgeClass}>Open</Badge>;
  if (status === "actioned") return <Badge className={adminBadgeClass}>Actioned</Badge>;
  return <Badge className={adminMutedBadgeClass}>Dismissed</Badge>;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

interface ReportRow {
  id: string;
  targetType: "review" | "comment";
  targetId: string;
  reason: string;
  note: string | null;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
  reporterName: string;
  targetBody: string | null;
  targetAuthor: string | null;
  targetRestricted: boolean;
  contentTitle: string | null;
  reviewId: string | null;
}

const reportSortAccessors: SortAccessors<ReportRow> = {
  what: (r) => r.targetType,
  film: (r) => r.contentTitle ?? "",
  author: (r) => r.targetAuthor ?? "",
  reason: (r) => r.reason,
  reporter: (r) => r.reporterName,
  status: (r) => r.status,
};

function ReportsSection({ initial }: { initial: ReportRow[] }) {
  const [reports, setReports] = useState<ReportRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "actioned" | "dismissed">("open");

  useEffect(() => {
    setReports(initial);
  }, [initial]);

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/admin/reports");
      const data = await jsonResponse<ReportRow[]>(response);
      if (data.success) setReports(data.data ?? []);
      else toast.error("Failed to load reports");
    } catch {
      toast.error("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: "open" | "actioned" | "dismissed") => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchReports();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update report");
      }
    } catch {
      toast.error("Failed to update report. Please try again.");
    }
  };

  const toggleRestrict = async (report: ReportRow) => {
    const path = report.targetType === "review" ? "user-ratings" : "comments";
    try {
      const response = await fetch(`/api/admin/${path}/${report.targetId}/restrict`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restricted: !report.targetRestricted }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchReports();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update post");
      }
    } catch {
      toast.error("Failed to update post. Please try again.");
    }
  };

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (r.contentTitle ?? "").toLowerCase().includes(q) ||
      (r.targetAuthor ?? "").toLowerCase().includes(q) ||
      (r.targetBody ?? "").toLowerCase().includes(q) ||
      r.reporterName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "all";
  const { sorted, sortKey, direction, toggleSort } = useTableSort(filteredReports, reportSortAccessors);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by film, author, reporter, or text…" />
        <Select value={statusFilter} onValueChange={(value: "all" | "open" | "actioned" | "dismissed") => setStatusFilter(value)}>
          <SelectTrigger className={`w-40 ${inputClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All Reports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filteredReports.length === 0 ? (
        <AdminEmptyState
          filtered={isFiltered}
          title="No reports"
          message={
            isFiltered
              ? "No reports match your search/filter."
              : "Everyone is behaving. Enjoy it while it lasts."
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="What" sortKey="what" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Film" sortKey="film" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Author" sortKey="author" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black">Content</TableHead>
                <SortableHead label="Reason" sortKey="reason" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Reporter" sortKey="reporter" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((report) => (
                <TableRow key={report.id} className="border-black/10 hover:bg-black/5">
                  <TableCell>
                    <Badge className={adminOutlineBadgeClass}>
                      {report.targetType === "review" ? "Review" : "Comment"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">
                    {report.contentTitle ?? <span className="text-black/40">—</span>}
                  </TableCell>
                  <TableCell>{report.targetAuthor ?? <span className="text-black/40">—</span>}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-sm font-light">
                    {report.targetBody ?? <span className="italic text-black/40">deleted</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {REASON_LABELS[report.reason] ?? report.reason}
                    {report.note && (
                      <span className="block text-xs font-light text-black/50">“{report.note}”</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{report.reporterName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadges status={report.status} />
                      {report.targetRestricted && <Badge className={adminBadgeClass}>Hidden</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {report.reviewId && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          title="Open review"
                          className="hover:bg-black/10"
                        >
                          <a href={`/reviews/${report.reviewId}`} target="_blank" rel="noopener noreferrer">
                            <ArrowSquareOutIcon className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {report.targetBody !== null && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={report.targetRestricted ? "Restore post" : "Hide post"}
                          onClick={() => toggleRestrict(report)}
                          className="hover:bg-black/10"
                        >
                          {report.targetRestricted ? (
                            <EyeIcon className="h-4 w-4" />
                          ) : (
                            <EyeSlashIcon className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {report.status === "open" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark actioned"
                            onClick={() => setStatus(report.id, "actioned")}
                            className="hover:bg-black/10"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Dismiss report"
                            onClick={() => setStatus(report.id, "dismissed")}
                            className="hover:bg-black/10"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reopen report"
                          onClick={() => setStatus(report.id, "open")}
                          className="hover:bg-black/10 text-xs"
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Reviews
// ---------------------------------------------------------------------------

interface RatingRow {
  id: string;
  contentTitle: string;
  username: string | null;
  rating: number;
  review: string | null;
  flagged: boolean;
  restricted: boolean;
  createdAt: string;
}

const ratingSortAccessors: SortAccessors<RatingRow> = {
  content: (r) => r.contentTitle,
  reviewer: (r) => r.username ?? "",
  rating: (r) => r.rating,
  review: (r) => r.review ?? "",
  status: (r) => (r.flagged ? 2 : 0) + (r.restricted ? 1 : 0),
};

function UserReviewsSection({ initial }: { initial: RatingRow[] }) {
  const [ratings, setRatings] = useState<RatingRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "flagged" | "restricted">("all");

  useEffect(() => {
    setRatings(initial);
  }, [initial]);

  const fetchRatings = async () => {
    try {
      const response = await fetch("/api/admin/user-ratings");
      const data = await jsonResponse<{ rating: RatingRow; user: { username?: string | null; name?: string | null } | null; film: { title?: string } | null }[]>(response);
      if (data.success) {
        setRatings(
          (data.data ?? []).map(({ rating, user, film }: { rating: RatingRow; user: { username?: string | null; name?: string | null } | null; film: { title?: string } | null }) => ({
            id: rating.id,
            contentTitle: film?.title ?? "Unlinked content",
            username: user?.username ?? user?.name ?? null,
            rating: rating.rating,
            review: rating.review ?? null,
            flagged: rating.flagged,
            restricted: rating.restricted,
            createdAt: rating.createdAt,
          })),
        );
      } else toast.error("Failed to load user reviews");
    } catch {
      toast.error("Failed to load user reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/user-ratings/${id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !currentValue }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchRatings();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update review");
      }
    } catch {
      toast.error("Failed to update review. Please try again.");
    }
  };

  const toggleRestrict = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/user-ratings/${id}/restrict`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restricted: !currentValue }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchRatings();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update review");
      }
    } catch {
      toast.error("Failed to update review. Please try again.");
    }
  };

  const filtered = ratings.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.contentTitle.toLowerCase().includes(q) ||
      (r.username ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "flagged" && r.flagged) ||
      (statusFilter === "restricted" && r.restricted);
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "all";
  const { sorted, sortKey, direction, toggleSort } = useTableSort(filtered, ratingSortAccessors);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by content or reviewer…" />
        <Select value={statusFilter} onValueChange={(value: "all" | "flagged" | "restricted") => setStatusFilter(value)}>
          <SelectTrigger className={`w-40 ${inputClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={isFiltered}
          title="No reviews yet"
          message={
            isFiltered
              ? "No user reviews match your search/filter."
              : "User-submitted ratings and reviews will appear here."
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="Content" sortKey="content" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Reviewer" sortKey="reviewer" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Rating" sortKey="rating" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Review" sortKey="review" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((rating) => (
                <TableRow key={rating.id} className="border-black/10 hover:bg-black/5">
                  <TableCell className="font-medium whitespace-normal">{rating.contentTitle}</TableCell>
                  <TableCell className="text-black/60">{rating.username || "—"}</TableCell>
                  <TableCell className="text-black/60">
                    {RATING_LABELS[rating.rating] ?? rating.rating}
                  </TableCell>
                  <TableCell
                    className="max-w-xs whitespace-normal text-black/60 line-clamp-2"
                    title={rating.review ?? undefined}
                  >
                    {rating.review || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {rating.flagged && <Badge className={adminBadgeClass}>Flagged</Badge>}
                      {rating.restricted && <Badge className={adminBadgeClass}>Restricted</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleFlag(rating.id, rating.flagged)}
                        title={rating.flagged ? "Remove flag" : "Flag for attention"}
                      >
                        <FlagIcon weight={rating.flagged ? "fill" : "regular"} className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleRestrict(rating.id, rating.restricted)}
                        title={rating.restricted ? "Restore to public view" : "Restrict from public view"}
                      >
                        {rating.restricted ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

interface CommentRow {
  id: string;
  reviewId: string;
  body: string;
  username: string | null;
  flagged: boolean;
  restricted: boolean;
  createdAt: string;
}

const commentSortAccessors: SortAccessors<CommentRow> = {
  author: (c) => c.username ?? "",
  comment: (c) => c.body,
  status: (c) => (c.flagged ? 2 : 0) + (c.restricted ? 1 : 0),
  sent: (c) => new Date(c.createdAt),
};

function CommentsSection({ initial }: { initial: CommentRow[] }) {
  const [comments, setComments] = useState<CommentRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "flagged" | "restricted">("all");

  useEffect(() => {
    setComments(initial);
  }, [initial]);

  const fetchComments = async () => {
    try {
      const response = await fetch("/api/admin/comments");
      const data = await jsonResponse<{ comment: CommentRow; user: { username?: string | null; name?: string | null } | null }[]>(response);
      if (data.success) {
        setComments(
          (data.data ?? []).map(({ comment, user }: { comment: CommentRow; user: { username?: string | null; name?: string | null } | null }) => ({
            id: comment.id,
            reviewId: comment.reviewId,
            body: comment.body,
            username: user?.username ?? user?.name ?? null,
            flagged: comment.flagged,
            restricted: comment.restricted,
            createdAt: comment.createdAt,
          })),
        );
      } else toast.error("Failed to load comments");
    } catch {
      toast.error("Failed to load comments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/comments/${id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !currentValue }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchComments();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update comment");
      }
    } catch {
      toast.error("Failed to update comment. Please try again.");
    }
  };

  const toggleRestrict = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/comments/${id}/restrict`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restricted: !currentValue }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchComments();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update comment");
      }
    } catch {
      toast.error("Failed to update comment. Please try again.");
    }
  };

  const filtered = comments.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q || c.body.toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "flagged" && c.flagged) ||
      (statusFilter === "restricted" && c.restricted);
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "all";
  const { sorted, sortKey, direction, toggleSort } = useTableSort(filtered, commentSortAccessors);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by comment or author…" />
        <Select value={statusFilter} onValueChange={(value: "all" | "flagged" | "restricted") => setStatusFilter(value)}>
          <SelectTrigger className={`w-40 ${inputClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Comments</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={isFiltered}
          title="No comments yet"
          message={
            isFiltered
              ? "No comments match your search/filter."
              : "Comments on member reviews will appear here."
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="Author" sortKey="author" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Comment" sortKey="comment" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Sent" sortKey="sent" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((comment) => (
                <TableRow key={comment.id} className="border-black/10 hover:bg-black/5">
                  <TableCell className="text-black/60">{comment.username || "—"}</TableCell>
                  <TableCell
                    className="max-w-md whitespace-normal text-sm font-light"
                    title={comment.body}
                  >
                    {comment.body}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-black/60">
                    {formatDate(comment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {comment.flagged && <Badge className={adminBadgeClass}>Flagged</Badge>}
                      {comment.restricted && <Badge className={adminBadgeClass}>Restricted</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleFlag(comment.id, comment.flagged)}
                        title={comment.flagged ? "Remove flag" : "Flag for attention"}
                      >
                        <FlagIcon weight={comment.flagged ? "fill" : "regular"} className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleRestrict(comment.id, comment.restricted)}
                        title={comment.restricted ? "Restore to public view" : "Restrict from public view"}
                      >
                        {comment.restricted ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

interface ContactRow {
  id: string;
  category: string;
  message: string;
  email: string | null;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
}

const contactSortAccessors: SortAccessors<ContactRow> = {
  category: (m) => m.category,
  sender: (m) => m.email ?? "",
  status: (m) => m.status,
  sent: (m) => new Date(m.createdAt),
};

function ContactSection({ initial }: { initial: ContactRow[] }) {
  const [messages, setMessages] = useState<ContactRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "actioned" | "dismissed">("open");

  useEffect(() => {
    setMessages(initial);
  }, [initial]);

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/admin/contact");
      const data = await jsonResponse<ContactRow[]>(response);
      if (data.success) setMessages(data.data ?? []);
      else toast.error("Failed to load messages");
    } catch {
      toast.error("Failed to load messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: "open" | "actioned" | "dismissed") => {
    try {
      const response = await fetch(`/api/admin/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchMessages();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update message");
      }
    } catch {
      toast.error("Failed to update message. Please try again.");
    }
  };

  const filtered = messages.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.message.toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== "" || statusFilter !== "all";
  const { sorted, sortKey, direction, toggleSort } = useTableSort(filtered, contactSortAccessors);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by message or sender…" />
        <Select value={statusFilter} onValueChange={(value: "all" | "open" | "actioned" | "dismissed") => setStatusFilter(value)}>
          <SelectTrigger className={`w-40 ${inputClass}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All Messages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          filtered={isFiltered}
          title="No messages"
          message={
            isFiltered
              ? "No messages match your search/filter."
              : "Nobody has found anything wrong yet. Suspicious."
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="About" sortKey="category" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black">Message</TableHead>
                <SortableHead label="From" sortKey="sender" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Sent" sortKey="sent" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((message) => (
                <TableRow key={message.id} className="border-black/10 hover:bg-black/5">
                  <TableCell>
                    <Badge className={`${adminOutlineBadgeClass} whitespace-normal`}>
                      {CATEGORY_LABELS[message.category] ?? message.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-sm font-light">
                    {message.message}
                  </TableCell>
                  <TableCell className="text-sm">
                    {message.email ? (
                      <a href={`mailto:${message.email}`} className="text-black/70 underline">
                        {message.email}
                      </a>
                    ) : (
                      <span className="italic text-black/40">anonymous</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-black/60">
                    {formatDate(message.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadges status={message.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {message.status === "open" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark actioned"
                            onClick={() => setStatus(message.id, "actioned")}
                            className="hover:bg-black/10"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Dismiss message"
                            onClick={() => setStatus(message.id, "dismissed")}
                            className="hover:bg-black/10"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reopen message"
                          onClick={() => setStatus(message.id, "open")}
                          className="hover:bg-black/10 text-xs"
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export default function AdminModerationRoute() {
  const { reports, ratings, comments, contacts } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Moderation"
        title="Keep the conversation healthy"
        description="Reports, member reviews, comments, and contact messages. Reporting flags a post but never hides it — restricting is yours to decide."
      />

      <Tabs defaultValue="reports" className="gap-0">
        <TabsList className="h-auto w-fit gap-1 rounded-sm border border-black/10 bg-transparent p-1">
          <TabsTrigger
            value="reports"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            User Reviews
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Comments
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="rounded-sm px-3 py-1.5 data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <ReportsSection initial={reports} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <UserReviewsSection initial={ratings} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <CommentsSection initial={comments} />
        </TabsContent>
        <TabsContent value="contact" className="mt-4">
          <ContactSection initial={contacts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
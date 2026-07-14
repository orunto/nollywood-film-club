'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FlagIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { EmptyListIllustration } from '@/components/graphics';
import { AdminUserRating } from '@/lib/server-queries';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs bg-black text-white rounded-sm";

const RATING_LABELS: Record<number, string> = {
  10: 'Liked it',
  5: 'It was okay',
  0: "Didn't like it",
};

const sortAccessors: SortAccessors<AdminUserRating> = {
  content: (r) => r.contentTitle,
  reviewer: (r) => r.username,
  rating: (r) => r.rating,
  review: (r) => r.review,
  status: (r) => (r.flagged ? 2 : 0) + (r.restricted ? 1 : 0),
};

export default function UserReviewsManagement() {
  const [ratings, setRatings] = useState<AdminUserRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'restricted'>('all');

  useEffect(() => {
    fetchRatings(true);
  }, []);

  const fetchRatings = async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/user-ratings');
      const data = await response.json();
      if (data.success) {
        setRatings(data.data);
      } else if (isInitial) {
        toast.error('Failed to load user reviews');
      }
    } catch (error) {
      console.error('Error fetching user ratings:', error);
      if (isInitial) toast.error('Failed to load user reviews');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/user-ratings/${id}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: !currentValue }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchRatings();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast.error('Failed to update review. Please try again.');
    }
  };

  const toggleRestrict = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/user-ratings/${id}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted: !currentValue }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchRatings();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error toggling restrict:', error);
      toast.error('Failed to update review. Please try again.');
    }
  };

  const filteredRatings = ratings.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.contentTitle.toLowerCase().includes(q) ||
      (r.username ?? '').toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'flagged' && r.flagged) ||
      (statusFilter === 'restricted' && r.restricted);
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all';
  const { sorted: sortedRatings, sortKey, direction, toggleSort } = useTableSort(filteredRatings, sortAccessors);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">User Reviews</h2>
        <p className="text-sm font-light text-black/60">Flag or restrict user-submitted ratings and reviews</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by content or reviewer…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`max-w-sm ${inputClass}`}
        />
        <Select value={statusFilter} onValueChange={(value: 'all' | 'flagged' | 'restricted') => setStatusFilter(value)}>
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
      ) : filteredRatings.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <EmptyListIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
          <h2 className="text-xl font-semibold mb-2">
            {isFiltered ? 'No matches found' : 'No reviews yet'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isFiltered
              ? 'No user reviews match your search/filter.'
              : 'User-submitted ratings and reviews will appear here.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="Content" sortKey="content" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Reviewer" sortKey="reviewer" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Rating" sortKey="rating" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Review" sortKey="review" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRatings.map((rating) => (
                <TableRow key={rating.id} className="border-black/10 hover:bg-black/5 group">
                  <TableCell className="font-medium whitespace-normal">{rating.contentTitle}</TableCell>
                  <TableCell className="text-black/60">{rating.username || '—'}</TableCell>
                  <TableCell className="text-black/60">
                    {rating.rating !== null ? RATING_LABELS[rating.rating] ?? rating.rating : '—'}
                  </TableCell>
                  <TableCell
                    className="text-black/60 max-w-xs truncate whitespace-normal line-clamp-2"
                    title={rating.review ?? undefined}
                  >
                    {rating.review || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {rating.flagged && <Badge className={badgeClass}>Flagged</Badge>}
                      {rating.restricted && <Badge className={badgeClass}>Restricted</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleFlag(rating.id, rating.flagged)}
                        title={rating.flagged ? 'Remove flag' : 'Flag for attention'}
                      >
                        <FlagIcon weight={rating.flagged ? 'fill' : 'regular'} className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-black/60 hover:text-black hover:bg-black/10"
                        onClick={() => toggleRestrict(rating.id, rating.restricted)}
                        title={rating.restricted ? 'Restore to public view' : 'Restrict from public view'}
                      >
                        {rating.restricted ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

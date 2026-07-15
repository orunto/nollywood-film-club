'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckIcon, EyeIcon, EyeSlashIcon, XIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { EmptyListIllustration } from '@/components/graphics';
import { AdminReport } from '@/lib/server-queries';
import { REPORT_REASONS } from '@/lib/pushback';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs bg-black text-white rounded-sm";

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);

const sortAccessors: SortAccessors<AdminReport> = {
  what: (r) => r.targetType,
  film: (r) => r.contentTitle ?? '',
  author: (r) => r.targetAuthor ?? '',
  reason: (r) => r.reason,
  reporter: (r) => r.reporterName,
  status: (r) => r.status,
};

export default function ReportsManagement() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'actioned' | 'dismissed'>('open');

  useEffect(() => {
    fetchReports(true);
  }, []);

  const fetchReports = async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();
      if (data.success) {
        setReports(data.data);
      } else if (isInitial) {
        toast.error('Failed to load reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (isInitial) toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: 'open' | 'actioned' | 'dismissed') => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchReports();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update report');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report. Please try again.');
    }
  };

  // Restricting hides the reported post itself; resolving the report is
  // separate, so an admin can hide something and still leave the report open.
  const toggleRestrict = async (report: AdminReport) => {
    const path = report.targetType === 'review' ? 'user-ratings' : 'pushbacks';
    try {
      const response = await fetch(`/api/admin/${path}/${report.targetId}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted: !report.targetRestricted }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchReports();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error restricting target:', error);
      toast.error('Failed to update post. Please try again.');
    }
  };

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (r.contentTitle ?? '').toLowerCase().includes(q) ||
      (r.targetAuthor ?? '').toLowerCase().includes(q) ||
      (r.targetBody ?? '').toLowerCase().includes(q) ||
      r.reporterName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all';
  const { sorted: sortedReports, sortKey, direction, toggleSort } = useTableSort(filteredReports, sortAccessors);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reports</h2>
        <p className="text-sm font-light text-black/60">
          Reviews and pushback reported by members. Reporting flags a post but never hides it —
          restricting is yours to decide.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by film, author, reporter, or text…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`max-w-sm ${inputClass}`}
        />
        <Select value={statusFilter} onValueChange={(value: 'all' | 'open' | 'actioned' | 'dismissed') => setStatusFilter(value)}>
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
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <EmptyListIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
          <h2 className="text-xl font-semibold mb-2">
            {isFiltered ? 'Nothing here' : 'No reports'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isFiltered
              ? 'No reports match your search/filter.'
              : 'Everyone is behaving. Enjoy it while it lasts.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
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
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.map((report) => (
                <TableRow key={report.id} className="border-black/10 hover:bg-black/5 group">
                  <TableCell>
                    <Badge className="text-xs bg-transparent border border-black text-black rounded-sm">
                      {report.targetType === 'review' ? 'Review' : 'Pushback'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">
                    {report.contentTitle ?? <span className="text-black/40">—</span>}
                  </TableCell>
                  <TableCell>{report.targetAuthor ?? <span className="text-black/40">—</span>}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-sm font-light">
                    {/* Null target = the post was deleted after being reported;
                        reports.target_id is polymorphic with no FK to cascade. */}
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
                      {report.status === 'open' && <Badge className={badgeClass}>Open</Badge>}
                      {report.status === 'actioned' && <Badge className={badgeClass}>Actioned</Badge>}
                      {report.status === 'dismissed' && (
                        <Badge className="text-xs bg-transparent border border-black/30 text-black/60 rounded-sm">
                          Dismissed
                        </Badge>
                      )}
                      {report.targetRestricted && <Badge className={badgeClass}>Hidden</Badge>}
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
                          <Link href={`/reviews/${report.reviewId}`} target="_blank">
                            <ArrowSquareOutIcon className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      {report.targetBody !== null && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={report.targetRestricted ? 'Restore post' : 'Hide post'}
                          onClick={() => toggleRestrict(report)}
                          className="hover:bg-black/10"
                        >
                          {report.targetRestricted ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {report.status === 'open' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark actioned"
                            onClick={() => setStatus(report.id, 'actioned')}
                            className="hover:bg-black/10"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Dismiss report"
                            onClick={() => setStatus(report.id, 'dismissed')}
                            className="hover:bg-black/10"
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reopen report"
                          onClick={() => setStatus(report.id, 'open')}
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
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { EmptyListIllustration } from '@/components/graphics';
import { AdminContactMessage } from '@/lib/server-queries';
import { CONTACT_CATEGORIES } from '@/lib/contact';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs bg-black text-white rounded-sm";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CONTACT_CATEGORIES.map((c) => [c.value, c.label]),
);

const formatWhen = (value: string) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

const sortAccessors: SortAccessors<AdminContactMessage> = {
  category: (m) => m.category,
  sender: (m) => m.senderName ?? '',
  status: (m) => m.status,
  sent: (m) => m.createdAt,
};

export default function ContactManagement() {
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'actioned' | 'dismissed'>('open');

  useEffect(() => {
    fetchMessages(true);
  }, []);

  const fetchMessages = async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/contact');
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      } else if (isInitial) {
        toast.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      if (isInitial) toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: 'open' | 'actioned' | 'dismissed') => {
    try {
      const response = await fetch(`/api/admin/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchMessages();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update message');
      }
    } catch (error) {
      console.error('Error updating contact message:', error);
      toast.error('Failed to update message. Please try again.');
    }
  };

  const filteredMessages = messages.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.message.toLowerCase().includes(q) ||
      (m.senderName ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all';
  const { sorted: sortedMessages, sortKey, direction, toggleSort } = useTableSort(filteredMessages, sortAccessors);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="text-sm font-light text-black/60">
          Bugs and suggestions sent from the Contact page. Senders do not need an account, so
          some of these arrive anonymous.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by message, sender, or email…"
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
            <SelectItem value="all">All Messages</SelectItem>
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
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <EmptyListIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
          <h2 className="text-xl font-semibold mb-2">
            {isFiltered ? 'Nothing here' : 'No messages'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isFiltered
              ? 'No messages match your search/filter.'
              : 'Nobody has found anything wrong yet. Suspicious.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="About" sortKey="category" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black">Message</TableHead>
                <SortableHead label="From" sortKey="sender" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Sent" sortKey="sent" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMessages.map((message) => (
                <TableRow key={message.id} className="border-black/10 hover:bg-black/5 group">
                  <TableCell>
                    <Badge className="text-xs bg-transparent border border-black text-black rounded-sm whitespace-normal">
                      {CATEGORY_LABELS[message.category] ?? message.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-sm font-light">
                    {message.message}
                  </TableCell>
                  <TableCell className="text-sm">
                    {message.senderName ?? <span className="italic text-black/40">anonymous</span>}
                    {message.email && (
                      <a
                        href={`mailto:${message.email}`}
                        className="block text-xs font-light text-black/50 underline"
                      >
                        {message.email}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatWhen(message.createdAt)}
                  </TableCell>
                  <TableCell>
                    {message.status === 'open' && <Badge className={badgeClass}>Open</Badge>}
                    {message.status === 'actioned' && <Badge className={badgeClass}>Actioned</Badge>}
                    {message.status === 'dismissed' && (
                      <Badge className="text-xs bg-transparent border border-black/30 text-black/60 rounded-sm">
                        Dismissed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {message.status === 'open' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark actioned"
                            onClick={() => setStatus(message.id, 'actioned')}
                            className="hover:bg-black/10"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Dismiss message"
                            onClick={() => setStatus(message.id, 'dismissed')}
                            className="hover:bg-black/10"
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reopen message"
                          onClick={() => setStatus(message.id, 'open')}
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

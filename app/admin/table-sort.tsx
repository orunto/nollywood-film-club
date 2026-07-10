'use client';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';

type SortValue = string | number | boolean | Date | null | undefined;
type SortDirection = 'asc' | 'desc';
export type SortAccessors<T> = Record<string, (item: T) => SortValue>;

function isEmpty(value: SortValue): boolean {
  return value === null || value === undefined || value === '';
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  }
  const aNum = a instanceof Date ? a.getTime() : Number(a);
  const bNum = b instanceof Date ? b.getTime() : Number(b);
  return aNum - bNum;
}

export function useTableSort<T>(items: T[], accessors: SortAccessors<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>('asc');

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return items;
    const accessor = accessors[sortKey];
    const factor = direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      // Empty values stay at the bottom in both directions
      if (isEmpty(av) && isEmpty(bv)) return 0;
      if (isEmpty(av)) return 1;
      if (isEmpty(bv)) return -1;
      return compareValues(av, bv) * factor;
    });
  }, [items, sortKey, direction, accessors]);

  return { sorted, sortKey, direction, toggleSort };
}

interface SortableHeadProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHead({ label, sortKey, activeKey, direction, onSort, className }: SortableHeadProps) {
  const isActive = activeKey === sortKey;
  return (
    <TableHead className={`text-black p-0 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 w-full h-10 px-2 font-medium whitespace-nowrap hover:bg-black/5 transition-colors select-none"
        aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}

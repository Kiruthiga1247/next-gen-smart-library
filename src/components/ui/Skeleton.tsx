import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={clsx('skeleton', className)} />
      ))}
    </>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="h-40 skeleton rounded-lg mb-4" />
      <div className="h-4 skeleton rounded mb-2 w-3/4" />
      <div className="h-3 skeleton rounded mb-3 w-1/2" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 skeleton rounded-full w-20" />
        <div className="h-5 skeleton rounded-full w-16" />
      </div>
      <div className="h-3 skeleton rounded w-1/3" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-700/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 skeleton rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-3 skeleton rounded w-1/2 mb-2" />
      <div className="h-8 skeleton rounded w-1/3" />
    </div>
  );
}

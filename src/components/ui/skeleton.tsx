import { HTMLAttributes } from 'react';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-stone-200/80 ${className || ''}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greetings Skeleton */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="w-12 h-12 rounded-2xl" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>

      {/* Card Skeletons */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function BookingsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex gap-1.5 p-1 bg-stone-100 rounded-2xl max-w-sm mx-auto">
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 flex-1 rounded-xl" />
        <Skeleton className="h-8 flex-1 rounded-xl" />
      </div>

      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

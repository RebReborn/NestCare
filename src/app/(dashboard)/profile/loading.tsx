import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

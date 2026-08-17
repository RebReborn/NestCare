import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

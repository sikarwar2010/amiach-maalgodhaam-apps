import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />
}

export function MaterialCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink-100 ring-inset">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="mt-2 flex items-end justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-2xl bg-ink-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-ink-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-ink-100" />
    </div>
  )
}

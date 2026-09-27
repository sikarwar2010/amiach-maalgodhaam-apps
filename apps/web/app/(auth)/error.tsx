"use client"

import { Button } from "@/components/ui/Button"

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className="flex min-h-[60vh] flex-col items-center justify-center px-4 pt-24 text-center">
      <h1 className="text-2xl font-extrabold text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        We couldn&apos;t load this page. Please try again, or head back to the marketplace.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-3 max-w-xl font-mono text-xs break-words text-danger-600">{error.message}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="outline">
          Home
        </Button>
      </div>
    </main>
  )
}

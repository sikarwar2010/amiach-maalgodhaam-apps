"use client"

import { Button } from "@/components/ui/Button"

export default function PortalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-danger-500/20 bg-danger-50 p-8 text-center">
      <h2 className="text-lg font-extrabold text-ink-900">We couldn&apos;t load this page</h2>
      <p className="mt-2 text-sm text-ink-600">Something went wrong on our side. Please try again in a moment.</p>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-2 font-mono text-xs text-danger-600">{error.message}</p>
      )}
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}

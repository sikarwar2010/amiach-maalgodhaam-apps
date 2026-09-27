import type { ProductCardDto } from "@workspace/types"

import { MaterialCard } from "@/components/cards/MaterialCard"

export function SimilarMaterials({
  listings,
  title = "Similar Materials",
}: {
  listings: ProductCardDto[]
  title?: string
}) {
  if (listings.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((listing) => (
          <MaterialCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

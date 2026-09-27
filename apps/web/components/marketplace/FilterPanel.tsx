"use client"

import { useState } from "react"
import type { CategoryDto, LocationDto } from "@workspace/types"

import { AccordionSection, CheckboxRow } from "@/components/ui/Accordion"
import { CONDITIONS, DEAL_TYPES, UNITS, conditionLabels, dealTypeLabels, unitLabels } from "@/lib/labels"
import type { CatalogueFilters } from "@/lib/catalogue-filters"
import { formatCurrency } from "@/lib/utils"

import { useFilterNav } from "./useFilterNav"

export function FilterPanel({
  filters,
  categories,
  locations,
  locked = [],
}: {
  filters: CatalogueFilters
  categories: CategoryDto[]
  locations: LocationDto[]
  /** Facets pinned by the page itself (e.g. the category page) and therefore not offered again. */
  locked?: string[]
}) {
  const { setParam, toggleListParam, push } = useFilterNav()

  return (
    <div>
      {!locked.includes("category") && (
        <AccordionSection title="Category" count={filters.category ? 1 : 0}>
          <div className="flex flex-col">
            {categories.map((c) => (
              <CheckboxRow
                key={c.id}
                label={c.name}
                suffix={c.productCount}
                checked={filters.category === c.slug}
                onChange={() => setParam("category", filters.category === c.slug ? undefined : c.slug)}
              />
            ))}
          </div>
        </AccordionSection>
      )}

      <AccordionSection title="Deal Type" count={filters.dealType ? 1 : 0}>
        <div className="flex flex-col">
          {DEAL_TYPES.map((d) => (
            <CheckboxRow
              key={d}
              label={dealTypeLabels[d]}
              checked={filters.dealType === d}
              onChange={() => setParam("dealType", filters.dealType === d ? undefined : d)}
            />
          ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Condition" count={filters.conditions.length}>
        <div className="flex flex-col">
          {CONDITIONS.map((c) => (
            <CheckboxRow
              key={c}
              label={conditionLabels[c]}
              checked={filters.conditions.includes(c)}
              onChange={() => toggleListParam("condition", c)}
            />
          ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Price per unit">
        <PriceRange
          key={`${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}`}
          min={filters.minPrice}
          max={filters.maxPrice}
          onApply={(minValue, maxValue) =>
            push((p) => {
              if (minValue) p.set("minPrice", minValue)
              else p.delete("minPrice")
              if (maxValue) p.set("maxPrice", maxValue)
              else p.delete("maxPrice")
            })
          }
        />
      </AccordionSection>

      <AccordionSection title="Unit" count={filters.unit ? 1 : 0} defaultOpen={false}>
        <div className="flex flex-col">
          {UNITS.map((unit) => (
            <CheckboxRow
              key={unit}
              label={unitLabels[unit]}
              checked={filters.unit === unit}
              onChange={() => setParam("unit", filters.unit === unit ? undefined : unit)}
            />
          ))}
        </div>
      </AccordionSection>

      {!locked.includes("city") && (
        <AccordionSection title="Location" count={filters.city ? 1 : 0} defaultOpen={false}>
          <div className="flex flex-col">
            {locations.map((l) => (
              <CheckboxRow
                key={`${l.city}-${l.state}`}
                label={l.city}
                suffix={l.listingCount}
                checked={filters.city?.toLowerCase() === l.city.toLowerCase()}
                onChange={() =>
                  setParam("city", filters.city?.toLowerCase() === l.city.toLowerCase() ? undefined : l.city)
                }
              />
            ))}
          </div>
        </AccordionSection>
      )}
    </div>
  )
}

/** Local draft state for the price inputs; remounted (via `key`) whenever the applied range changes. */
function PriceRange({
  min,
  max,
  onApply,
}: {
  min: number | undefined
  max: number | undefined
  onApply: (min: string, max: string) => void
}) {
  const [minValue, setMinValue] = useState(min?.toString() ?? "")
  const [maxValue, setMaxValue] = useState(max?.toString() ?? "")
  const apply = () => onApply(minValue, maxValue)
  const input =
    "mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-ink-400" htmlFor="price-min">
            Min
          </label>
          <input
            id="price-min"
            type="number"
            inputMode="numeric"
            min={0}
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="0"
            className={input}
          />
        </div>
        <span className="mt-4 text-ink-300">—</span>
        <div className="flex-1">
          <label className="text-xs text-ink-400" htmlFor="price-max">
            Max
          </label>
          <input
            id="price-max"
            type="number"
            inputMode="numeric"
            min={0}
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Any"
            className={input}
          />
        </div>
      </div>
      {(min !== undefined || max !== undefined) && (
        <p className="mt-2 text-xs text-ink-400">
          {formatCurrency(min ?? 0)} – {max !== undefined ? formatCurrency(max) : "any"}
        </p>
      )}
    </>
  )
}

"use client"

import Image from "next/image"
import { useState } from "react"
import { ImageOff, ZoomIn } from "lucide-react"
import type { ProductImageDto } from "@workspace/types"

import { cn } from "@/lib/utils"

export function ImageGallery({ images, title }: { images: ProductImageDto[]; title: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = images[active]

  if (!current) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-ink-100 text-ink-300 ring-1 ring-ink-100 ring-inset">
        <ImageOff size={40} aria-label="No images available" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl bg-ink-100 ring-1 ring-ink-100 ring-inset"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
      >
        <Image
          src={current.url}
          alt={current.alt ?? title}
          fill
          preload
          sizes="(min-width: 1024px) 44vw, 92vw"
          className={cn("object-cover transition-transform duration-500 ease-out", zoomed && "scale-125")}
        />
        <span className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-600 shadow-soft-sm">
          <ZoomIn size={16} />
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-medium text-white">
          {active + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={active === i}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 transition-all",
                active === i ? "ring-brand-600" : "ring-transparent hover:ring-ink-200"
              )}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

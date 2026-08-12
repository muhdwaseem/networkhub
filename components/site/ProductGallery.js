"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, name }) {
  const gallery = images?.length ? images : ["/images/placeholders/accessory.svg"];
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <Image
          src={gallery[active]}
          alt={name}
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-contain p-6"
          priority
        />
      </div>

      {gallery.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {gallery.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-slate-50 ring-1 transition-all ${
                i === active ? "ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={img} alt="" fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

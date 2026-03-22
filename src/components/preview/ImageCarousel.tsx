"use client";

import React, { useState } from "react";

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  height?: number;
  borderRadius?: number;
}

export function ImageCarousel({ images, alt = "Product image", height = 180, borderRadius = 12 }: ImageCarouselProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-100"
        style={{ height, borderRadius: `${borderRadius}px ${borderRadius}px 0 0` }}
      >
        <span className="text-4xl opacity-20">🏨</span>
      </div>
    );
  }

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < images.length - 1;

  return (
    <div className="relative w-full overflow-hidden group" style={{ height, borderRadius: `${borderRadius}px ${borderRadius}px 0 0` }}>
      <img
        src={images[currentIdx]}
        alt={`${alt} ${currentIdx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-200"
        loading="lazy"
      />

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); if (hasPrev) setCurrentIdx(currentIdx - 1); }}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              hasPrev
                ? "bg-white/90 hover:bg-white text-gray-700 shadow-md opacity-0 group-hover:opacity-100"
                : "bg-white/40 text-gray-400 cursor-default opacity-0"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (hasNext) setCurrentIdx(currentIdx + 1); }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              hasNext
                ? "bg-white/90 hover:bg-white text-gray-700 shadow-md opacity-0 group-hover:opacity-100"
                : "bg-white/40 text-gray-400 cursor-default opacity-0"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentIdx ? "bg-white w-3" : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Sale Price Display ---
export function PriceDisplay({
  price,
  salePrice,
  currency = "CAD",
  unit = "per night",
  primaryColor = "#006c4b",
}: {
  price: number;
  salePrice?: number | null;
  currency?: string;
  unit?: string;
  primaryColor?: string;
}) {
  const isOnSale = salePrice != null && salePrice < price;
  const displayPrice = isOnSale ? salePrice : price;

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency, minimumFractionDigits: 2 }).format(v);

  return (
    <div className="flex flex-col items-end">
      {isOnSale && (
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">🏷 SALE</span>
        </div>
      )}
      <div className="font-bold text-sm" style={{ color: primaryColor }}>
        {fmt(displayPrice)}
        <span className="text-[10px] font-normal text-gray-400 ml-1">/{unit}</span>
      </div>
      {isOnSale && (
        <div className="text-[10px] text-gray-400 line-through">{fmt(price)}</div>
      )}
    </div>
  );
}

// --- Availability Badge ---
export function AvailabilityBadge({
  available,
  total,
  unavailableUntil,
}: {
  available?: number;
  total?: number;
  unavailableUntil?: string;
}) {
  if (unavailableUntil) {
    return (
      <div className="text-[10px] text-red-500 font-medium">
        Unavailable until {unavailableUntil}
      </div>
    );
  }

  if (available != null && total != null) {
    const pct = total > 0 ? available / total : 0;
    const color = pct > 0.5 ? "#22c55e" : pct > 0.2 ? "#f59e0b" : "#ef4444";
    return (
      <div className="text-[10px] font-medium" style={{ color }}>
        {available}/{total} Available
      </div>
    );
  }

  return null;
}

// --- Expandable Details Section ---
export function ExpandableDetails({
  details,
  moreDetails,
  maxCollapsedHeight = 0,
}: {
  details?: string;
  moreDetails?: string;
  maxCollapsedHeight?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!details && !moreDetails) return null;

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        {expanded ? "Hide" : "Show"} Details
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 text-xs text-gray-600">
          {details && (
            <div className="p-2.5 bg-gray-50 rounded-lg" dangerouslySetInnerHTML={{ __html: details }} />
          )}
          {moreDetails && (
            <div className="p-2.5 bg-gray-50 rounded-lg border-l-2 border-gray-300" dangerouslySetInnerHTML={{ __html: moreDetails }} />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-14 border-b border-outline-variant bg-white flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.8" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="text-sm tracking-tight">Funnel Editor</span>
        </Link>
        {title && (
          <>
            <span className="text-outline-variant">/</span>
            <span className="text-sm font-medium text-on-surface truncate max-w-[300px]">
              {title}
            </span>
          </>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

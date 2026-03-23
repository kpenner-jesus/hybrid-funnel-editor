"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFunnelStore } from "@/stores/funnel-store";
import { Button } from "@/components/shared/Button";
import type { FunnelDefinition } from "@/lib/types";

// ─── Create Modal ─────────────────────────────────────────

function CreateFunnelModal({
  onClose,
  onCreate,
  templates,
}: {
  onClose: () => void;
  onCreate: (name: string, fromTemplate?: string) => void;
  templates: FunnelDefinition[];
}) {
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create New Funnel</h2>
          <p className="text-sm text-gray-500 mt-1">Start blank or from an existing template</p>
        </div>

        <div className="p-6 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name.trim(), selectedTemplate || undefined)}
            placeholder="Funnel name..."
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            autoFocus
          />

          {templates.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Start from template (optional)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    !selectedTemplate
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="font-medium">Blank funnel</span>
                  <span className="text-xs text-gray-400 ml-2">— start from scratch</span>
                </button>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      — {t.steps.length} steps
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), selectedTemplate || undefined)}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3-dot Menu ───────────────────────────────────────────

function ContextMenu({
  onEdit,
  onClone,
  onRename,
  onDelete,
  onClose,
  position,
}: {
  onEdit: () => void;
  onClone: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-44"
      style={{ top: position.y, left: position.x }}
    >
      <button onClick={onEdit} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        Edit
      </button>
      <button onClick={onClone} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        Clone
      </button>
      <button onClick={onRename} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
        Rename
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={onDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
        Delete
      </button>
    </div>
  );
}

// ─── Funnel Card ──────────────────────────────────────────

function FunnelCard({
  funnel,
  onEdit,
  onClone,
  onRename,
  onDelete,
}: {
  funnel: FunnelDefinition;
  onEdit: () => void;
  onClone: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(funnel.name);
  const totalWidgets = funnel.steps.reduce((acc, s) => acc + s.widgets.length, 0);

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== funnel.name) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all group cursor-pointer overflow-hidden"
        onClick={onEdit}
      >
        {/* Color bar at top */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${funnel.theme.primaryColor}, ${funnel.theme.secondaryColor})` }} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-base font-bold text-gray-900 w-full px-2 py-1 -ml-2 border border-primary rounded-lg focus:outline-none"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-base text-gray-900 truncate">{funnel.name}</h3>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                  {funnel.steps.length} steps
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                  {totalWidgets} widgets
                </span>
              </div>
            </div>

            {/* 3-dot menu */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuPos({ x: e.clientX - 160, y: e.clientY });
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          {/* Step preview chips */}
          <div className="flex flex-wrap gap-1 mt-3">
            {funnel.steps.slice(0, 6).map((step, i) => (
              <span
                key={step.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-[120px]"
                style={{
                  backgroundColor: `${funnel.theme.primaryColor}12`,
                  color: funnel.theme.primaryColor,
                }}
              >
                {i + 1}. {step.title || "Untitled"}
              </span>
            ))}
            {funnel.steps.length > 6 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] text-gray-400 bg-gray-100">
                +{funnel.steps.length - 6} more
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">
              Updated {new Date(funnel.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-xs font-medium px-3 py-1 rounded-lg text-white transition-colors"
              style={{ backgroundColor: funnel.theme.primaryColor }}
            >
              Open
            </button>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {menuPos && (
        <ContextMenu
          position={menuPos}
          onEdit={() => { setMenuPos(null); onEdit(); }}
          onClone={() => { setMenuPos(null); onClone(); }}
          onRename={() => { setMenuPos(null); setIsRenaming(true); }}
          onDelete={() => { setMenuPos(null); onDelete(); }}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  );
}

// ─── Home Page ────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { funnels, initialize, createFunnel, deleteFunnel, cloneFunnel, renameFunnel, initialized } = useFunnelStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  const handleCreate = (name: string, fromTemplate?: string) => {
    let id: string;
    if (fromTemplate) {
      id = cloneFunnel(fromTemplate, name);
    } else {
      id = createFunnel(name);
    }
    setShowCreate(false);
    router.push(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Nav bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" /><rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" opacity="0.5" /></svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Funnel Editor</h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">by Everybooking</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            New Funnel
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats bar */}
        {funnels.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Funnels</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {funnels.length} funnel{funnels.length !== 1 ? "s" : ""} &middot; {funnels.reduce((a, f) => a + f.steps.length, 0)} total steps
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {funnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="14" height="14" rx="3" stroke="#006c4b" strokeWidth="2" />
                <rect x="22" y="4" width="14" height="14" rx="3" stroke="#006c4b" strokeWidth="2" />
                <rect x="4" y="22" width="14" height="14" rx="3" stroke="#006c4b" strokeWidth="2" />
                <rect x="22" y="22" width="14" height="14" rx="3" stroke="#006c4b" strokeWidth="2" opacity="0.3" />
                <path d="M29 25v8M25 29h8" stroke="#006c4b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Create your first funnel</h2>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
              Build AI-assisted quotation and booking funnels for any service business. Start from scratch or use the AI to generate a complete funnel in seconds.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              Create New Funnel
            </button>
          </div>
        ) : (
          /* Funnel grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {funnels.map((funnel) => (
              <FunnelCard
                key={funnel.id}
                funnel={funnel}
                onEdit={() => router.push(`/editor/${funnel.id}`)}
                onClone={() => {
                  const newId = cloneFunnel(funnel.id, `${funnel.name} (Copy)`);
                  router.push(`/editor/${newId}`);
                }}
                onRename={(newName) => renameFunnel(funnel.id, newName)}
                onDelete={() => deleteFunnel(funnel.id)}
              />
            ))}

            {/* Add new card */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium mt-2">New Funnel</span>
            </button>
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateFunnelModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          templates={funnels}
        />
      )}
    </div>
  );
}

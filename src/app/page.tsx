"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnelStore } from "@/stores/funnel-store";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import type { FunnelDefinition } from "@/lib/types";

function CreateFunnelModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6">
        <h2 className="text-lg font-semibold font-serif mb-4">Create New Funnel</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreate(name.trim())}
          placeholder="Funnel name..."
          className="w-full px-4 py-2.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function FunnelCard({
  funnel,
  onEdit,
  onDelete,
}: {
  funnel: FunnelDefinition;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-outline-variant hover:border-primary/40 hover:shadow-md transition-all p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base font-serif">{funnel.name}</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            {funnel.steps.length} step{funnel.steps.length !== 1 ? "s" : ""} &middot;{" "}
            {funnel.steps.reduce((acc, s) => acc + s.widgets.length, 0)} widgets
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: funnel.theme.primaryColor + "15" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill={funnel.theme.primaryColor}>
            <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4z" />
          </svg>
        </div>
      </div>

      {/* Theme preview strip */}
      <div className="flex gap-1.5 mb-4">
        <div
          className="h-2 flex-1 rounded-full"
          style={{ backgroundColor: funnel.theme.primaryColor }}
        />
        <div
          className="h-2 w-12 rounded-full"
          style={{ backgroundColor: funnel.theme.secondaryColor }}
        />
        <div
          className="h-2 w-8 rounded-full"
          style={{ backgroundColor: funnel.theme.surfaceColor, border: "1px solid #e5e7eb" }}
        />
      </div>

      <div className="text-[10px] text-outline mb-4">
        Last updated: {new Date(funnel.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onEdit} className="flex-1">
          Edit
        </Button>
        {confirmDelete ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onDelete();
              setConfirmDelete(false);
            }}
          >
            Confirm Delete
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { funnels, initialize, createFunnel, deleteFunnel, initialized } = useFunnelStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const handleCreate = (name: string) => {
    const id = createFunnel(name);
    setShowCreate(false);
    router.push(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Create New Funnel
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-on-surface">Your Funnels</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Create and manage booking funnels with reusable widget templates.
          </p>
        </div>

        {funnels.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-outline-variant rounded-2xl">
            <div className="text-4xl mb-4">&#128640;</div>
            <h2 className="text-lg font-semibold font-serif mb-2">No funnels yet</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              Create your first funnel to get started.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              Create Your First Funnel
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map((funnel) => (
              <FunnelCard
                key={funnel.id}
                funnel={funnel}
                onEdit={() => router.push(`/editor/${funnel.id}`)}
                onDelete={() => deleteFunnel(funnel.id)}
              />
            ))}

            {/* Add new card */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium mt-2">New Funnel</span>
            </button>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateFunnelModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

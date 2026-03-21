"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFunnelStore } from "@/stores/funnel-store";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { StepList } from "@/components/editor/StepList";
import { WidgetConfig } from "@/components/editor/WidgetConfig";
import { ThemeEditor } from "@/components/editor/ThemeEditor";
import { VariableFlow } from "@/components/editor/VariableFlow";
import { FunnelPreview } from "@/components/preview/FunnelPreview";

type EditorTab = "steps" | "theme" | "variables";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    funnel,
    loadFunnel,
    saveFunnel,
    initialize,
    initialized,
    isDirty,
    dataMode,
    setDataMode,
    selectedWidgetId,
  } = useFunnelStore();

  const [activeTab, setActiveTab] = useState<EditorTab>("steps");
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    if (initialized && id) {
      loadFunnel(id);
    }
  }, [initialized, id, loadFunnel]);

  const handleSave = () => {
    saveFunnel();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-sm text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold font-serif mb-2">Funnel not found</h2>
            <p className="text-sm text-on-surface-variant mb-4">
              The funnel you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "steps", label: "Steps" },
    { id: "theme", label: "Theme" },
    { id: "variables", label: "Variables" },
  ];

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top Bar */}
      <Header
        title={funnel.name}
        actions={
          <div className="flex items-center gap-3">
            {/* Data mode toggle */}
            <div className="flex items-center gap-1.5 bg-surface-dim rounded-lg p-0.5">
              <button
                onClick={() => setDataMode("mock")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dataMode === "mock"
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Mock
              </button>
              <button
                onClick={() => setDataMode("live")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dataMode === "live"
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Live
              </button>
            </div>

            {/* Save */}
            <Button
              size="sm"
              variant={saveFlash ? "secondary" : "outline"}
              onClick={handleSave}
              disabled={!isDirty && !saveFlash}
            >
              {saveFlash ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Saved
                </>
              ) : (
                <>Save{isDirty ? " *" : ""}</>
              )}
            </Button>

            {/* Publish */}
            <Button size="sm">Publish</Button>
          </div>
        }
      />

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor (40%) */}
        <div className="w-[40%] min-w-[360px] border-r border-outline-variant flex flex-col bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-outline-variant">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "steps" && (
              <div className="space-y-4">
                <StepList />
                {selectedWidgetId && (
                  <div className="border-t border-outline-variant pt-4">
                    <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
                      Widget Configuration
                    </div>
                    <WidgetConfig />
                  </div>
                )}
              </div>
            )}
            {activeTab === "theme" && <ThemeEditor />}
            {activeTab === "variables" && <VariableFlow />}
          </div>
        </div>

        {/* Right Panel - Preview (60%) */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Preview header */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="text-xs text-gray-400 font-mono">Preview</div>
            <div className="w-16" />
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-hidden">
            <FunnelPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

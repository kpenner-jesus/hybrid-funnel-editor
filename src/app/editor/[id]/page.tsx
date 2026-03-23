"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFunnelStore } from "@/stores/funnel-store";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/shared/Button";
import { StepList } from "@/components/editor/StepList";
import { WidgetConfig } from "@/components/editor/WidgetConfig";
import { ThemeEditor } from "@/components/editor/ThemeEditor";
import { VariableFlow } from "@/components/editor/VariableFlow";
import { FunnelPreview } from "@/components/preview/FunnelPreview";
import { PublishModal } from "@/components/editor/PublishModal";
import { DiagnosticsPanel } from "@/components/editor/DiagnosticsPanel";
import { AiChatPanel } from "@/components/ai/AiChatPanel";
import { Tooltip } from "@/components/shared/Tooltip";
import { WidgetLibraryPanel } from "@/components/editor/WidgetLibraryPanel";
import { useAiStore } from "@/stores/ai-store";
import { generateFunnelJSX } from "@/lib/jsx-generator";

type EditorTab = "steps" | "theme" | "variables" | "library";

// Error boundary to catch rendering crashes
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-lg text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-2">Editor crashed</h1>
            <p className="text-sm text-gray-500 mb-4">
              This is usually caused by corrupted saved data. Try clearing your browser storage.
            </p>
            <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-left overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  try { localStorage.removeItem("hybrid-funnel-editor-funnels"); } catch {}
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                Clear Data & Go Home
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EditorPageWrapper() {
  return (
    <EditorErrorBoundary>
      <EditorPageInner />
    </EditorErrorBoundary>
  );
}

function EditorPageInner() {
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
    canUndo,
    canRedo,
    undo,
    redo,
  } = useFunnelStore();

  const { aiPanelOpen, togglePanel: toggleAiPanel } = useAiStore();
  const [activeTab, setActiveTab] = useState<EditorTab>("steps");
  const [saveFlash, setSaveFlash] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [generatedJSX, setGeneratedJSX] = useState("");

  // Resizable panel divider
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === "undefined") return 40;
    try {
      const saved = localStorage.getItem("editor-panel-width");
      if (saved) { const n = parseFloat(saved); if (n >= 20 && n <= 70) return n; }
    } catch {}
    return 40;
  });
  const isDraggingRef = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    const containerWidth = (e.currentTarget.parentElement?.clientWidth || window.innerWidth);
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientX - startX;
      const newPct = Math.min(70, Math.max(20, startWidth + (delta / containerWidth) * 100));
      setPanelWidth(newPct);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist
      setPanelWidth(prev => { localStorage.setItem("editor-panel-width", String(prev)); return prev; });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [panelWidth]);

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

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA";
      if (isInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleSave = () => {
    saveFunnel();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const handlePublish = () => {
    if (!funnel) return;
    const jsx = generateFunnelJSX(funnel);
    setGeneratedJSX(jsx);
    setPublishModalOpen(true);
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

  const tabs: { id: EditorTab; label: string; tip: string }[] = [
    { id: "steps", label: "Steps", tip: "Build your funnel's pages and widgets" },
    { id: "library", label: "Library", tip: "Browse and search all available widgets" },
    { id: "theme", label: "Theme", tip: "Colors, fonts, and navigation layout" },
    { id: "variables", label: "Variables", tip: "See how data flows between steps (advanced)" },
  ];

  return (
    <div className="h-screen flex flex-col bg-surface overflow-auto md:overflow-hidden">
      {/* Top Bar */}
      <Header
        title={funnel.name}
        actions={
          <div className="flex items-center gap-3">
            {/* Data mode toggle */}
            <Tooltip text={dataMode === "mock" ? "Using sample data for preview" : "Using real business data from your store"} position="bottom">
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
            </Tooltip>

            {/* Save */}
            <Tooltip text={isDirty ? "Save your changes — shared with your team" : "All changes saved"} position="bottom">
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
            </Tooltip>

            {/* Undo / Redo */}
            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="px-2 py-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 7h7a3 3 0 0 1 0 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="w-px h-5 bg-outline-variant" />
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="px-2 py-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 7H5a3 3 0 0 0 0 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Diagnostics */}
            <button
              onClick={() => setDiagOpen(true)}
              title="Diagnostics — copy debug info"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors border border-outline-variant"
            >
              🔧
            </button>

            {/* AI Assistant */}
            <Button
              size="sm"
              variant={aiPanelOpen ? "secondary" : "outline"}
              onClick={toggleAiPanel}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1l1.46 2.98L12 4.9 9.55 7.28l.57 3.37L7 9.28l-3.12 1.37.57-3.37L2 4.9l3.54-.92L7 1z"
                  fill="currentColor"
                />
              </svg>
              AI
            </Button>

            {/* Publish */}
            <Tooltip text="Generate the final code for your funnel. You'll review it before anything goes live." position="bottom">
              <Button size="sm" onClick={handlePublish}>Publish</Button>
            </Tooltip>
          </div>
        }
      />

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-auto md:overflow-hidden min-h-0">
        {/* Left Panel - Editor */}
        <div
          style={{ width: `${panelWidth}%`, minWidth: '300px', maxWidth: '70%' }}
          className="border-r border-outline-variant flex flex-col bg-white shrink-0"
        >
          {/* Tab bar */}
          <div className="flex border-b border-outline-variant">
            {tabs.map((tab) => (
              <Tooltip key={tab.id} text={tab.tip} position="bottom">
              <button
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
              </Tooltip>
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
            {activeTab === "library" && <WidgetLibraryPanel />}
            {activeTab === "theme" && <ThemeEditor />}
            {activeTab === "variables" && (
              <VariableFlow onNavigateToWidget={(stepId, widgetId) => {
                const { setPreviewStep, selectStep, selectWidget } = useFunnelStore.getState();
                setPreviewStep(stepId);
                selectStep(stepId);
                selectWidget(widgetId);
                window.dispatchEvent(new CustomEvent("navigate-to-widget", { detail: { stepId, widgetId } }));
              }} />
            )}
          </div>
        </div>

        {/* Resizable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="w-1.5 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0 relative group"
          title="Drag to resize panels"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-outline-variant group-hover:bg-primary/40 group-active:bg-primary transition-colors" />
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Preview header removed — Step/Flow toggle is inside FunnelPreview */}

          {/* Preview content */}
          <div className="flex-1 overflow-hidden min-h-[500px]">
            <FunnelPreview onSwitchToSteps={() => setActiveTab("steps")} />
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      {publishModalOpen && (
        <PublishModal
          jsxCode={generatedJSX}
          funnelName={funnel.name}
          onClose={() => setPublishModalOpen(false)}
        />
      )}

      {/* Diagnostics Panel */}
      <DiagnosticsPanel open={diagOpen} onClose={() => setDiagOpen(false)} />

      {/* AI Chat Panel */}
      <AiChatPanel />
    </div>
  );
}

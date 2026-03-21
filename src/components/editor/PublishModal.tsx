"use client";

import React, { useCallback, useState } from "react";

interface PublishModalProps {
  jsxCode: string;
  funnelName: string;
  onClose: () => void;
}

export function PublishModal({ jsxCode, funnelName, onClose }: PublishModalProps) {
  const [copied, setCopied] = useState(false);

  const lineCount = jsxCode.split("\n").length;
  const byteSize = new Blob([jsxCode]).size;
  const sizeLabel =
    byteSize < 1024
      ? `${byteSize} B`
      : byteSize < 1024 * 1024
        ? `${(byteSize / 1024).toFixed(1)} KB`
        : `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;

  const fileName =
    funnelName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-funnel.jsx";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsxCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = jsxCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [jsxCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([jsxCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [jsxCode, fileName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[90vw] h-[90vh] max-w-[1100px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold font-serif text-gray-900">
              Generated JSX
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {fileName} &middot; {lineCount} lines &middot; {sizeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-primary text-white hover:bg-primary-dark"
              }`}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8.5l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 11V3.5A.5.5 0 013.5 3H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8m0 0l3-3m-3 3L5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 12h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Download .jsx
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Code block */}
        <div className="flex-1 overflow-auto bg-gray-950 p-0">
          <pre className="text-sm leading-relaxed p-6 text-gray-200">
            <code>{jsxCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

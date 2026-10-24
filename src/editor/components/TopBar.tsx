import React, { useEffect, useState } from "react";
import { EditorState } from "../state/editorTypes";

type TopBarProps = {
  state: EditorState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onOpenAI: () => void;
  onRenameProject: (name: string) => void;
};

export const TopBar: React.FC<TopBarProps> = ({
  state,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onOpenAI,
  onRenameProject,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(state.projectName);
  useEffect(() => setProjectName(state.projectName), [state.projectName]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onRenameProject(projectName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="top-bar">
      {/* Left: Branding & Project */}
      <div className="top-bar-left">
        <div className="app-brand">
          <div className="app-brand-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span>Studio</span>
        </div>

        {isEditingName ? (
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              className="prop-input"
              style={{ width: "160px", textAlign: "left" }}
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => {
                if (projectName.trim()) {
                  onRenameProject(projectName.trim());
                }
                setIsEditingName(false);
              }}
            />
          </form>
        ) : (
          <div
            className="project-selector"
            onClick={() => setIsEditingName(true)}
            title="Click to rename project"
          >
            <span>{state.projectName}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      {/* Middle: Undo, Redo, Save Indicator */}
      <div className="top-bar-middle">
        <button
          className="btn btn-icon"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>

        <button
          className="btn btn-icon"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
          </svg>
        </button>

        <div className="save-badge">
          <div className="save-dot" />
          <span>{state.saveStatus === "saving" ? "Saving..." : state.saveStatus === "unsaved" ? "Edited" : "Saved"}</span>
        </div>
      </div>

      {/* Right: AI Assistant, Export */}
      <div className="top-bar-right">
        <button
          className="btn"
          style={{
            borderColor: "rgba(139, 124, 255, 0.4)",
            color: "var(--accent)",
            background: "rgba(139, 124, 255, 0.08)",
          }}
          onClick={onOpenAI}
          title="Open AI Assistant"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>AI Assistant</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenExport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

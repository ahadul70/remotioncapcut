import React from "react";
import { EditorState } from "../state/editorTypes";

type ExportDialogProps = {
  state: EditorState;
  onClose: () => void;
};

export const ExportDialog: React.FC<ExportDialogProps> = ({ state, onClose }) => {
  const durationSec = (state.totalDurationInFrames / state.fps).toFixed(1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            Export Project
          </span>
          <button
            className="btn btn-icon"
            style={{ width: "24px", height: "24px" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div className="prop-row">
            <span className="prop-label">Project Name</span>
            <span style={{ fontWeight: 500 }}>{state.projectName}</span>
          </div>

          <div className="prop-row">
            <span className="prop-label">Resolution</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {state.width} × {state.height} (9:16 Vertical)
            </span>
          </div>

          <div className="prop-row">
            <span className="prop-label">Frame Rate</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{state.fps} fps</span>
          </div>

          <div className="prop-row">
            <span className="prop-label">Duration</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {state.totalDurationInFrames} frames ({durationSec}s)
            </span>
          </div>

          <div className="prop-row">
            <span className="prop-label">Format / Codec</span>
            <span>MP4 (H.264 / AAC)</span>
          </div>

          <div
            style={{
              padding: "10px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginTop: "4px",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
              Ready for Remotion Rendering
            </div>
            The exported video composition is isolated and contains zero editor UI. Run the following command in terminal to render:
            <code
              style={{
                display: "block",
                padding: "6px 8px",
                background: "#0c0d10",
                borderRadius: "4px",
                marginTop: "6px",
                color: "#60a5fa",
                fontFamily: "var(--font-mono)",
              }}
            >
              npx remotion render src/index.ts MyComp out/video.mp4
            </code>
            <div style={{ marginTop: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
              * Note: Imported local files exist in browser session memory (Blob URLs). For offline terminal rendering with custom media, place files in the <code>public/</code> folder.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { Clip } from "../state/editorTypes";

type PropertiesPanelProps = {
  selectedClip: Clip | null;
  onUpdateProperties: (properties: Partial<Clip>) => void;
  onDeleteClip: () => void;
  onSplitClip: () => void;
  currentFrame: number;
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedClip,
  onUpdateProperties,
  onDeleteClip,
  onSplitClip,
  currentFrame,
}) => {
  if (!selectedClip) {
    return (
      <aside className="properties-inspector" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--text-muted)", marginBottom: "12px" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
          No Clip Selected
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: "180px" }}>
          Select a clip on the timeline to view and adjust its properties.
        </p>
      </aside>
    );
  }

  const isPlayheadInside =
    currentFrame > selectedClip.timelineStartFrame &&
    currentFrame < selectedClip.timelineStartFrame + selectedClip.durationInFrames;

  return (
    <aside className="properties-inspector">
      <div className="pane-header">
        <span className="pane-title">Properties</span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {selectedClip.type.toUpperCase()}
        </span>
      </div>

      {/* Basic Info */}
      <div className="inspector-section">
        <div className="section-label">Clip Info</div>
        <div className="prop-row">
          <span className="prop-label">Name</span>
          <input
            type="text"
            className="prop-input"
            style={{ width: "130px", textAlign: "left" }}
            value={selectedClip.name}
            onChange={(e) => onUpdateProperties({ name: e.target.value })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Timeline Start</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {selectedClip.timelineStartFrame}f ({(selectedClip.timelineStartFrame / 30).toFixed(2)}s)
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Duration</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {selectedClip.durationInFrames}f ({(selectedClip.durationInFrames / 30).toFixed(2)}s)
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Source In-Point</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {selectedClip.sourceStartFrame}f
          </span>
        </div>
      </div>

      {/* Transform */}
      <div className="inspector-section">
        <div className="section-label">Transform</div>
        <div className="prop-row">
          <span className="prop-label">Scale</span>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="3"
            className="prop-input"
            value={selectedClip.scale ?? 1}
            onChange={(e) => onUpdateProperties({ scale: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Position X</span>
          <input
            type="number"
            className="prop-input"
            value={selectedClip.positionX ?? 0}
            onChange={(e) => onUpdateProperties({ positionX: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Position Y</span>
          <input
            type="number"
            className="prop-input"
            value={selectedClip.positionY ?? 0}
            onChange={(e) => onUpdateProperties({ positionY: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Rotation (°)</span>
          <input
            type="number"
            className="prop-input"
            value={selectedClip.rotation ?? 0}
            onChange={(e) => onUpdateProperties({ rotation: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Opacity</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            className="prop-input"
            value={selectedClip.opacity ?? 1}
            onChange={(e) => onUpdateProperties({ opacity: parseFloat(e.target.value) || 1 })}
          />
        </div>
      </div>

      {/* Audio Section */}
      <div className="inspector-section">
        <div className="section-label">Audio</div>
        <div className="prop-row">
          <span className="prop-label">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            style={{ width: "90px", accentColor: "var(--accent)" }}
            value={selectedClip.volume ?? 1}
            onChange={(e) => onUpdateProperties({ volume: parseFloat(e.target.value) })}
          />
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", width: "30px", textAlign: "right" }}>
            {Math.round((selectedClip.volume ?? 1) * 100)}%
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Mute Audio</span>
          <button
            className={`btn ${selectedClip.muted ? "btn-danger" : ""}`}
            style={{ padding: "3px 8px", fontSize: "11px" }}
            onClick={() => onUpdateProperties({ muted: !selectedClip.muted })}
          >
            {selectedClip.muted ? "Muted" : "Active"}
          </button>
        </div>
      </div>

      {/* Speed Section */}
      <div className="inspector-section">
        <div className="section-label">Speed</div>
        <div className="prop-row">
          <span className="prop-label">Playback Rate</span>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            1.0x (Normal)
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
          Time stretching & speed curves planned for Phase 4.
        </div>
      </div>

      {/* Clip Actions */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          className="btn"
          disabled={!isPlayheadInside}
          onClick={onSplitClip}
          title={isPlayheadInside ? "Split clip at current playhead" : "Playhead must be inside clip"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          Split at Playhead (S)
        </button>

        <button
          className="btn"
          onClick={() =>
            onUpdateProperties({
              scale: 1,
              positionX: 0,
              positionY: 0,
              rotation: 0,
              opacity: 1,
              volume: 1,
              muted: false,
            })
          }
        >
          Reset Properties
        </button>

        <button className="btn btn-danger" onClick={onDeleteClip}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Clip (Del)
        </button>
      </div>
    </aside>
  );
};

import React from "react";
import { Clip, Track } from "../state/editorTypes";

type PropertiesPanelProps = {
  selectedClip: Clip | null;
  tracks: Track[];
  fps: number;
  onUpdateProperties: (properties: Partial<Clip>) => void;
  onDeleteClip: () => void;
  onSplitClip: () => void;
  currentFrame: number;
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedClip,
  tracks,
  fps,
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

  const currentTrack = tracks.find((t) => t.id === selectedClip.trackId);
  const isTrackLocked = currentTrack?.locked === true;
  const compatibleTracks = tracks.filter((t) => t.type === selectedClip.type);

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

      {/* Locked Track Warning Banner */}
      {isTrackLocked && (
        <div
          style={{
            margin: "0 12px 12px",
            padding: "8px 10px",
            background: "rgba(233, 184, 106, 0.15)",
            border: "1px solid var(--warning)",
            borderRadius: "var(--radius-sm)",
            fontSize: "11px",
            color: "var(--warning)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Track is locked. Editing disabled.</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="inspector-section">
        <div className="section-label">Clip Info</div>
        <div className="prop-row">
          <span className="prop-label">Name</span>
          <input
            type="text"
            className="prop-input"
            disabled={isTrackLocked}
            style={{ width: "130px", textAlign: "left", opacity: isTrackLocked ? 0.6 : 1 }}
            value={selectedClip.name}
            onChange={(e) => onUpdateProperties({ name: e.target.value })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Track</span>
          <select
            className="prop-input"
            disabled={isTrackLocked}
            style={{
              width: "130px",
              textAlign: "left",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              opacity: isTrackLocked ? 0.6 : 1,
            }}
            value={selectedClip.trackId}
            onChange={(e) => onUpdateProperties({ trackId: e.target.value })}
          >
            {compatibleTracks.map((t) => (
              <option key={t.id} value={t.id} disabled={t.locked}>
                {t.name} {t.locked ? "(Locked)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="prop-row">
          <span className="prop-label">Timeline Start</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {selectedClip.timelineStartFrame}f ({(selectedClip.timelineStartFrame / fps).toFixed(2)}s)
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Duration</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            {selectedClip.durationInFrames}f ({(selectedClip.durationInFrames / fps).toFixed(2)}s)
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
            disabled={isTrackLocked}
            style={{ opacity: isTrackLocked ? 0.6 : 1 }}
            value={selectedClip.scale ?? 1}
            onChange={(e) => onUpdateProperties({ scale: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Position X</span>
          <input
            type="number"
            step="5"
            className="prop-input"
            disabled={isTrackLocked}
            style={{ opacity: isTrackLocked ? 0.6 : 1 }}
            value={selectedClip.positionX ?? 0}
            onChange={(e) => onUpdateProperties({ positionX: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Position Y</span>
          <input
            type="number"
            step="5"
            className="prop-input"
            disabled={isTrackLocked}
            style={{ opacity: isTrackLocked ? 0.6 : 1 }}
            value={selectedClip.positionY ?? 0}
            onChange={(e) => onUpdateProperties({ positionY: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            style={{ width: "90px", accentColor: "var(--accent)" }}
            disabled={isTrackLocked}
            value={selectedClip.opacity ?? 1}
            onChange={(e) => onUpdateProperties({ opacity: parseFloat(e.target.value) })}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", minWidth: "30px", textAlign: "right" }}>
            {Math.round((selectedClip.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Audio volume if video or audio */}
      {(selectedClip.type === "video" || selectedClip.type === "audio") && (
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
              disabled={isTrackLocked}
              value={selectedClip.volume ?? 1}
              onChange={(e) => onUpdateProperties({ volume: parseFloat(e.target.value) })}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", minWidth: "30px", textAlign: "right" }}>
              {Math.round((selectedClip.volume ?? 1) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Speed / Playback */}
      <div className="inspector-section">
        <div className="section-label">Speed</div>
        <div className="prop-row">
          <span className="prop-label">Playback Rate</span>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            1.0x (Normal)
          </span>
        </div>
      </div>

      {/* Clip Actions */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          className="btn"
          disabled={!isPlayheadInside || isTrackLocked}
          onClick={onSplitClip}
          title={
            isTrackLocked
              ? "Cannot split clips on a locked track"
              : isPlayheadInside
              ? "Split clip at current playhead"
              : "Playhead must be inside clip"
          }
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          Split at Playhead (S)
        </button>

        <button
          className="btn"
          disabled={isTrackLocked}
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

        <button
          className="btn btn-danger"
          disabled={isTrackLocked}
          onClick={onDeleteClip}
          title={isTrackLocked ? "Cannot delete clips on a locked track" : "Delete Selected Clip (Del)"}
        >
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

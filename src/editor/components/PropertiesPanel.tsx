import React from "react";
import { Clip, ClipTransition, EffectType, Track, TransitionType } from "../state/editorTypes";
import {
  EFFECT_METADATA,
  TRANSITION_TYPES,
  getMaxTransitionDuration,
} from "../utils/effectAndTransitionUtils";

type PropertiesPanelProps = {
  selectedClip: Clip | null;
  selectedTransition: ClipTransition | null;
  allClips: Clip[];
  transitions: ClipTransition[];
  tracks: Track[];
  fps: number;
  onUpdateProperties: (properties: Partial<Clip>) => void;
  onUpdateEffect: (effectType: EffectType, enabled?: boolean, value?: number) => void;
  onRemoveEffect: (effectType: EffectType) => void;
  onResetEffects: () => void;
  onAddTransition: (transition: Omit<ClipTransition, "id">) => void;
  onUpdateTransition: (id: string, properties: Partial<Omit<ClipTransition, "id">>) => void;
  onDeleteTransition: (id: string) => void;
  onDeleteClip: () => void;
  onSplitClip: () => void;
  currentFrame: number;
};

const EFFECT_KEYS: EffectType[] = [
  "brightness",
  "contrast",
  "saturation",
  "grayscale",
  "blur",
  "vignette",
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedClip,
  selectedTransition,
  allClips,
  transitions,
  tracks,
  fps,
  onUpdateProperties,
  onUpdateEffect,
  onResetEffects,
  onAddTransition,
  onUpdateTransition,
  onDeleteTransition,
  onDeleteClip,
  onSplitClip,
  currentFrame,
}) => {
  // 1. Transition Inspector
  if (selectedTransition) {
    const track = tracks.find((t) => t.id === selectedTransition.trackId);
    const isTrackLocked = track?.locked === true;
    const fromClip = allClips.find((c) => c.id === selectedTransition.fromClipId);
    const toClip = allClips.find((c) => c.id === selectedTransition.toClipId);

    let maxDuration = 120;
    if (fromClip) maxDuration = Math.min(maxDuration, getMaxTransitionDuration(fromClip.durationInFrames));
    if (toClip) maxDuration = Math.min(maxDuration, getMaxTransitionDuration(toClip.durationInFrames));

    const durationSec = (selectedTransition.durationInFrames / fps).toFixed(2);

    return (
      <aside className="properties-inspector">
        <div className="pane-header">
          <span className="pane-title">Transition</span>
          <span style={{ fontSize: "11px", color: "var(--accent)" }}>
            {selectedTransition.type.toUpperCase()}
          </span>
        </div>

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
            }}
          >
            Track is locked. Editing disabled.
          </div>
        )}

        <div className="inspector-section">
          <div className="section-label">Transition Settings</div>

          <div className="prop-row">
            <span className="prop-label">Type</span>
            <select
              className="prop-input"
              disabled={isTrackLocked}
              style={{
                width: "140px",
                textAlign: "left",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
              value={selectedTransition.type}
              onChange={(e) =>
                onUpdateTransition(selectedTransition.id, {
                  type: e.target.value as TransitionType,
                })
              }
            >
              {TRANSITION_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="prop-row">
            <span className="prop-label">Duration</span>
            <input
              type="range"
              min="3"
              max={Math.max(3, maxDuration)}
              step="1"
              disabled={isTrackLocked}
              style={{ width: "85px", accentColor: "var(--accent)" }}
              value={selectedTransition.durationInFrames}
              onChange={(e) =>
                onUpdateTransition(selectedTransition.id, {
                  durationInFrames: parseInt(e.target.value, 10),
                })
              }
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", minWidth: "55px", textAlign: "right" }}>
              {selectedTransition.durationInFrames}f ({durationSec}s)
            </span>
          </div>

          <div className="prop-row">
            <span className="prop-label">Track</span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {track ? track.name : selectedTransition.trackId}
            </span>
          </div>

          {fromClip && (
            <div className="prop-row">
              <span className="prop-label">Outgoing Clip</span>
              <span style={{ fontSize: "11px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                {fromClip.name}
              </span>
            </div>
          )}

          {toClip && (
            <div className="prop-row">
              <span className="prop-label">Incoming Clip</span>
              <span style={{ fontSize: "11px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                {toClip.name}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            className="btn btn-danger"
            disabled={isTrackLocked}
            onClick={() => onDeleteTransition(selectedTransition.id)}
          >
            Delete Transition
          </button>
        </div>
      </aside>
    );
  }

  // 2. Empty State
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
          Select a clip or transition on the timeline to view and adjust its properties.
        </p>
      </aside>
    );
  }

  // 3. Clip Inspector
  const currentTrack = tracks.find((t) => t.id === selectedClip.trackId);
  const isTrackLocked = currentTrack?.locked === true;
  const compatibleTracks = tracks.filter((t) => t.type === selectedClip.type);

  const isPlayheadInside =
    currentFrame > selectedClip.timelineStartFrame &&
    currentFrame < selectedClip.timelineStartFrame + selectedClip.durationInFrames;

  // Transitions related to this clip
  const clipTransitions = transitions.filter(
    (t) => t.fromClipId === selectedClip.id || t.toClipId === selectedClip.id
  );

  // Check adjacent clip on same track for easy between-clip transition creation
  const clipEnd = selectedClip.timelineStartFrame + selectedClip.durationInFrames;
  const nextAdjacentClip = allClips.find(
    (c) => c.trackId === selectedClip.trackId && c.id !== selectedClip.id && Math.abs(c.timelineStartFrame - clipEnd) <= 2
  );
  const hasTransitionToNext = transitions.some(
    (t) => t.fromClipId === selectedClip.id && t.toClipId === nextAdjacentClip?.id
  );

  const maxTransDuration = getMaxTransitionDuration(selectedClip.durationInFrames);

  return (
    <aside className="properties-inspector">
      <div className="pane-header">
        <span className="pane-title">Properties</span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {selectedClip.type.toUpperCase()}
        </span>
      </div>

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

      {/* Step 7: Video Effects Section (for visual clips) */}
      {selectedClip.type !== "audio" && (
        <div className="inspector-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="section-label" style={{ marginBottom: 0 }}>Video Effects</span>
            {(selectedClip.effects?.length ?? 0) > 0 && (
              <button
                className="btn btn-icon"
                style={{ fontSize: "10px", padding: "2px 6px", height: "auto" }}
                disabled={isTrackLocked}
                onClick={onResetEffects}
                title="Reset all effects to defaults"
              >
                Reset
              </button>
            )}
          </div>

          {EFFECT_KEYS.map((key) => {
            const meta = EFFECT_METADATA[key];
            const eff = selectedClip.effects?.find((e) => e.type === key);
            const isEnabled = eff?.enabled ?? false;
            const currentVal = eff?.value ?? meta.defaultVal;

            return (
              <div key={key} style={{ marginBottom: "6px" }}>
                <div className="prop-row" style={{ marginBottom: "2px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: isTrackLocked ? "not-allowed" : "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={isTrackLocked}
                      onChange={(e) => onUpdateEffect(key, e.target.checked, currentVal)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="prop-label" style={{ color: isEnabled ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {meta.label}
                    </span>
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: isEnabled ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {currentVal}{meta.unit}
                  </span>
                </div>

                {isEnabled && (
                  <div style={{ paddingLeft: "20px" }}>
                    <input
                      type="range"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      disabled={isTrackLocked}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                      value={currentVal}
                      onChange={(e) => onUpdateEffect(key, true, parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step 7: Transitions Section (for visual clips) */}
      {selectedClip.type !== "audio" && (
        <div className="inspector-section">
          <div className="section-label">Transitions</div>

          {/* Existing transitions on this clip */}
          {clipTransitions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
              {clipTransitions.map((t) => {
                const isIncoming = t.toClipId === selectedClip.id;
                const label = t.type === "crossfade" ? "Cross Dissolve" : t.type === "fade-from-black" ? "Fade In (Black)" : "Fade Out (Black)";
                const dir = isIncoming ? "Head (In)" : "Tail (Out)";
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      background: "var(--bg-elevated)",
                      borderRadius: "4px",
                      fontSize: "11px",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--accent)", fontWeight: 500 }}>{dir}: </span>
                      <span>{label} ({t.durationInFrames}f)</span>
                    </div>
                    <button
                      className="btn btn-icon"
                      style={{ width: "18px", height: "18px", padding: 0 }}
                      disabled={isTrackLocked}
                      onClick={() => onDeleteTransition(t.id)}
                      title="Remove transition"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick add transition buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                className="btn"
                style={{ flex: 1, fontSize: "11px", padding: "4px 6px" }}
                disabled={isTrackLocked || selectedClip.durationInFrames < 6}
                onClick={() =>
                  onAddTransition({
                    type: "fade-from-black",
                    durationInFrames: Math.min(15, maxTransDuration),
                    trackId: selectedClip.trackId,
                    toClipId: selectedClip.id,
                  })
                }
              >
                + Fade In
              </button>

              <button
                className="btn"
                style={{ flex: 1, fontSize: "11px", padding: "4px 6px" }}
                disabled={isTrackLocked || selectedClip.durationInFrames < 6}
                onClick={() =>
                  onAddTransition({
                    type: "fade-to-black",
                    durationInFrames: Math.min(15, maxTransDuration),
                    trackId: selectedClip.trackId,
                    fromClipId: selectedClip.id,
                  })
                }
              >
                + Fade Out
              </button>
            </div>

            {nextAdjacentClip && !hasTransitionToNext && (
              <button
                className="btn"
                style={{ fontSize: "11px", padding: "4px 6px", background: "rgba(59, 130, 246, 0.15)", borderColor: "var(--accent)" }}
                disabled={isTrackLocked}
                onClick={() =>
                  onAddTransition({
                    type: "crossfade",
                    durationInFrames: Math.min(15, maxTransDuration, getMaxTransitionDuration(nextAdjacentClip.durationInFrames)),
                    trackId: selectedClip.trackId,
                    fromClipId: selectedClip.id,
                    toClipId: nextAdjacentClip.id,
                  })
                }
              >
                + Cross Dissolve to Next Clip
              </button>
            )}
          </div>
        </div>
      )}

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

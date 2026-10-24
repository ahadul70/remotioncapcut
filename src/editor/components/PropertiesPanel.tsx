import React from "react";
import {
  Clip,
  ClipTransition,
  EditorialGraphicData,
  EffectType,
  PaperCutoutParams,
  DropSettleParams,
  PaperSlideParams,
  TextHighlightParams,
  StaggerWordsParams,
  Track,
  TransitionType,
} from "../state/editorTypes";
import {
  EFFECT_METADATA,
  getMaxTransitionDuration,
} from "../utils/effectAndTransitionUtils";
import { EDITORIAL_TRANSITION_TYPES } from "../utils/editorialRegistry";

type PropertiesPanelProps = {
  selectedClip: Clip | null;
  selectedTransition: ClipTransition | null;
  allClips: Clip[];
  transitions: ClipTransition[];
  tracks: Track[];
  fps: number;
  onUpdateProperties: (properties: Partial<Clip>) => void;
  onUpdateEffect: (effectType: EffectType, enabled?: boolean, value?: number, params?: Record<string, unknown>) => void;
  onUpdateEffectParams?: (effectType: EffectType, params: Record<string, unknown>) => void;
  onUpdateGraphicData?: (graphicData: Partial<EditorialGraphicData>) => void;
  onRemoveEffect: (effectType: EffectType) => void;
  onResetEffects: () => void;
  onAddTransition: (transition: Omit<ClipTransition, "id">) => void;
  onUpdateTransition: (id: string, properties: Partial<Omit<ClipTransition, "id">>) => void;
  onDeleteTransition: (id: string) => void;
  onDeleteClip: () => void;
  onSplitClip: () => void;
  currentFrame: number;
};

const FILTER_EFFECT_KEYS: EffectType[] = [
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
  onUpdateEffectParams,
  onUpdateGraphicData,
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
              {EDITORIAL_TRANSITION_TYPES.map((t) => (
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
  const compatibleTrackType = selectedClip.type === "audio" ? "audio" : "video";
  const compatibleTracks = tracks.filter((t) => t.type === compatibleTrackType);

  const isPlayheadInside =
    currentFrame > selectedClip.timelineStartFrame &&
    currentFrame < selectedClip.timelineStartFrame + selectedClip.durationInFrames;

  const clipTransitions = transitions.filter(
    (t) => t.fromClipId === selectedClip.id || t.toClipId === selectedClip.id
  );

  const clipEnd = selectedClip.timelineStartFrame + selectedClip.durationInFrames;
  const nextAdjacentClip = allClips.find(
    (c) => c.trackId === selectedClip.trackId && c.id !== selectedClip.id && Math.abs(c.timelineStartFrame - clipEnd) <= 2
  );
  const hasTransitionToNext = transitions.some(
    (t) => t.fromClipId === selectedClip.id && t.toClipId === nextAdjacentClip?.id
  );

  const maxTransDuration = getMaxTransitionDuration(selectedClip.durationInFrames);

  // Helper for reading and writing effect params
  const getEffect = (type: EffectType) => selectedClip.effects?.find((e) => e.type === type);
  const isEffectEnabled = (type: EffectType) => getEffect(type)?.enabled ?? false;

  const updateParam = (type: EffectType, key: string, val: unknown) => {
    if (onUpdateEffectParams) {
      onUpdateEffectParams(type, { [key]: val });
    } else {
      const eff = getEffect(type);
      onUpdateEffect(type, eff?.enabled ?? true, eff?.value ?? 50, { [key]: val });
    }
  };

  const paperEff = getEffect("paper-cutout");
  const paperParams: PaperCutoutParams = (paperEff?.params as PaperCutoutParams) || {};

  const dropEff = getEffect("drop-settle");
  const dropParams: DropSettleParams = (dropEff?.params as DropSettleParams) || {};

  const slideEff = getEffect("paper-slide");
  const slideParams: PaperSlideParams = (slideEff?.params as PaperSlideParams) || {};

  const highlightEff = getEffect("text-highlight");
  const highlightParams: TextHighlightParams = (highlightEff?.params as TextHighlightParams) || {};

  const staggerEff = getEffect("stagger-words");
  const staggerParams: StaggerWordsParams = (staggerEff?.params as StaggerWordsParams) || {};

  return (
    <aside className="properties-inspector">
      <div className="pane-header">
        <span className="pane-title">Properties</span>
        <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>
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

      {/* Clip Basic Info */}
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

      {/* Editorial Graphic Data Inspector */}
      {selectedClip.type === "graphic" && selectedClip.graphicData && (
        <div className="inspector-section" style={{ borderLeft: "3px solid #3b82f6" }}>
          <div className="section-label" style={{ color: "#3b82f6", fontWeight: 700 }}>
            Editorial Graphic ({selectedClip.graphicData.graphicType})
          </div>

          {selectedClip.graphicData.graphicType === "comparison-bars" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="prop-row">
                <span className="prop-label">Entity A</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.comparisonBars?.labelA ?? "Platform A"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, labelA: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Value A</span>
                <input
                  type="number"
                  className="prop-input"
                  style={{ width: "70px" }}
                  value={selectedClip.graphicData.comparisonBars?.valueA ?? 50}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, valueA: parseFloat(e.target.value) || 0 },
                    });
                  }}
                />
                <input
                  type="color"
                  value={selectedClip.graphicData.comparisonBars?.colorA ?? "#3b82f6"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, colorA: e.target.value },
                    });
                  }}
                  style={{ width: "28px", height: "24px", border: "none", cursor: "pointer", background: "none" }}
                  title="Color A"
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Entity B</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.comparisonBars?.labelB ?? "Platform B"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, labelB: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Value B</span>
                <input
                  type="number"
                  className="prop-input"
                  style={{ width: "70px" }}
                  value={selectedClip.graphicData.comparisonBars?.valueB ?? 30}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, valueB: parseFloat(e.target.value) || 0 },
                    });
                  }}
                />
                <input
                  type="color"
                  value={selectedClip.graphicData.comparisonBars?.colorB ?? "#f43f5e"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, colorB: e.target.value },
                    });
                  }}
                  style={{ width: "28px", height: "24px", border: "none", cursor: "pointer", background: "none" }}
                  title="Color B"
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Unit</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "60px" }}
                  value={selectedClip.graphicData.comparisonBars?.unit ?? "%"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.comparisonBars || { labelA: "A", valueA: 50, labelB: "B", valueB: 30 };
                    onUpdateGraphicData?.({
                      comparisonBars: { ...current, unit: e.target.value },
                    });
                  }}
                />
              </div>
            </div>
          )}

          {selectedClip.graphicData.graphicType === "stat-card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="prop-row">
                <span className="prop-label">Stat Value</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px" }}
                  value={selectedClip.graphicData.statCard?.value ?? "$4.8B"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.statCard || { value: "$0", label: "STAT" };
                    onUpdateGraphicData?.({
                      statCard: { ...current, value: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Metric Label</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.statCard?.label ?? "METRIC"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.statCard || { value: "$0", label: "STAT" };
                    onUpdateGraphicData?.({
                      statCard: { ...current, label: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Delta Growth</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px" }}
                  value={selectedClip.graphicData.statCard?.delta ?? "+34.2% YoY"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.statCard || { value: "$0", label: "STAT" };
                    onUpdateGraphicData?.({
                      statCard: { ...current, delta: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Source Citation</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.statCard?.caption ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.statCard || { value: "$0", label: "STAT" };
                    onUpdateGraphicData?.({
                      statCard: { ...current, caption: e.target.value },
                    });
                  }}
                />
              </div>
            </div>
          )}

          {selectedClip.graphicData.graphicType === "evidence-card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="prop-row">
                <span className="prop-label">Headline</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.evidenceCard?.headline ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.evidenceCard || { quote: "", source: "" };
                    onUpdateGraphicData?.({
                      evidenceCard: { ...current, headline: e.target.value },
                    });
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="prop-label">Document Excerpt / Quote</span>
                <textarea
                  className="prop-input"
                  rows={3}
                  style={{ width: "100%", textAlign: "left", resize: "vertical", fontSize: "11px" }}
                  value={selectedClip.graphicData.evidenceCard?.quote ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.evidenceCard || { quote: "", source: "" };
                    onUpdateGraphicData?.({
                      evidenceCard: { ...current, quote: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Highlighted Phrase</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.evidenceCard?.highlightedPhrase ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.evidenceCard || { quote: "", source: "" };
                    onUpdateGraphicData?.({
                      evidenceCard: { ...current, highlightedPhrase: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Source Citation</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.evidenceCard?.source ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.evidenceCard || { quote: "", source: "" };
                    onUpdateGraphicData?.({
                      evidenceCard: { ...current, source: e.target.value },
                    });
                  }}
                />
              </div>
            </div>
          )}

          {selectedClip.graphicData.graphicType === "percentage-card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="prop-row">
                <span className="prop-label">Metric Label</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "130px", textAlign: "left" }}
                  value={selectedClip.graphicData.percentageCard?.metric ?? ""}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.percentageCard || { metric: "", fromValue: 0, toValue: 100 };
                    onUpdateGraphicData?.({
                      percentageCard: { ...current, metric: e.target.value },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">From Value</span>
                <input
                  type="number"
                  className="prop-input"
                  style={{ width: "80px" }}
                  value={selectedClip.graphicData.percentageCard?.fromValue ?? 0}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.percentageCard || { metric: "", fromValue: 0, toValue: 100 };
                    onUpdateGraphicData?.({
                      percentageCard: { ...current, fromValue: parseFloat(e.target.value) || 0 },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">To Value</span>
                <input
                  type="number"
                  className="prop-input"
                  style={{ width: "80px" }}
                  value={selectedClip.graphicData.percentageCard?.toValue ?? 100}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.percentageCard || { metric: "", fromValue: 0, toValue: 100 };
                    onUpdateGraphicData?.({
                      percentageCard: { ...current, toValue: parseFloat(e.target.value) || 0 },
                    });
                  }}
                />
              </div>
              <div className="prop-row">
                <span className="prop-label">Unit</span>
                <input
                  type="text"
                  className="prop-input"
                  style={{ width: "60px" }}
                  value={selectedClip.graphicData.percentageCard?.unit ?? "%"}
                  onChange={(e) => {
                    const current = selectedClip.graphicData?.percentageCard || { metric: "", fromValue: 0, toValue: 100 };
                    onUpdateGraphicData?.({
                      percentageCard: { ...current, unit: e.target.value },
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Clip Content Inspector */}
      {selectedClip.type === "text" && (
        <div className="inspector-section" style={{ borderLeft: "3px solid #f59e0b" }}>
          <div className="section-label" style={{ color: "#f59e0b" }}>Editorial Typography</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <textarea
              className="prop-input"
              rows={2}
              style={{ width: "100%", textAlign: "left", resize: "vertical", fontSize: "12px" }}
              value={selectedClip.text ?? ""}
              onChange={(e) => onUpdateProperties({ text: e.target.value })}
              placeholder="Headline or narrative title..."
            />
            <div className="prop-row">
              <span className="prop-label">Font Size</span>
              <input
                type="number"
                min="12"
                max="120"
                className="prop-input"
                style={{ width: "70px" }}
                value={selectedClip.fontSize ?? 48}
                onChange={(e) => onUpdateProperties({ fontSize: parseInt(e.target.value, 10) || 48 })}
              />
            </div>
            <div className="prop-row">
              <span className="prop-label">Color</span>
              <input
                type="color"
                value={selectedClip.color ?? "#ffffff"}
                onChange={(e) => onUpdateProperties({ color: e.target.value })}
                style={{ width: "32px", height: "24px", border: "none", cursor: "pointer", background: "none" }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Physical Paper-Cutout & Editorial Physics (Vox Style) */}
      {selectedClip.type !== "audio" && (
        <div className="inspector-section" style={{ background: "rgba(251, 251, 250, 0.03)", borderRadius: "var(--radius-md)", padding: "10px" }}>
          <div className="section-label" style={{ color: "#e2e8f0", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📄</span> Physical Paper-Cutout (Vox Style)
          </div>

          {/* Paper Cutout Toggle & Controls */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={isEffectEnabled("paper-cutout")}
                onChange={(e) => onUpdateEffect("paper-cutout", e.target.checked)}
                style={{ accentColor: "#f59e0b" }}
              />
              <span style={{ fontSize: "12px", fontWeight: 600, color: isEffectEnabled("paper-cutout") ? "var(--text-primary)" : "var(--text-muted)" }}>
                Paper Cutout Frame & Matte
              </span>
            </label>

            {isEffectEnabled("paper-cutout") && (
              <div style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="prop-row">
                  <span className="prop-label">Tilt Angle</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={paperParams.tiltAngle ?? -2.5}
                    onChange={(e) => updateParam("paper-cutout", "tiltAngle", parseFloat(e.target.value))}
                    style={{ width: "80px", accentColor: "#f59e0b" }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{paperParams.tiltAngle ?? -2.5}°</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Border Width</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={paperParams.borderWidth ?? 8}
                    onChange={(e) => updateParam("paper-cutout", "borderWidth", parseInt(e.target.value, 10) || 0)}
                    className="prop-input"
                    style={{ width: "60px" }}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">Tape Style</span>
                  <select
                    className="prop-input"
                    style={{ width: "110px", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    value={paperParams.tapeStyle ?? "corners"}
                    onChange={(e) => updateParam("paper-cutout", "tapeStyle", e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="corners">Tape Corners</option>
                    <option value="top-center">Top Center Tape</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Drop & Settle Physics Toggle & Controls */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={isEffectEnabled("drop-settle")}
                onChange={(e) => onUpdateEffect("drop-settle", e.target.checked)}
                style={{ accentColor: "#10b981" }}
              />
              <span style={{ fontSize: "12px", fontWeight: 600, color: isEffectEnabled("drop-settle") ? "var(--text-primary)" : "var(--text-muted)" }}>
                Drop & Settle Physics
              </span>
            </label>

            {isEffectEnabled("drop-settle") && (
              <div style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="prop-row">
                  <span className="prop-label">Drop Height</span>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    step="10"
                    value={dropParams.startOffsetY ?? 180}
                    onChange={(e) => updateParam("drop-settle", "startOffsetY", parseInt(e.target.value, 10) || 180)}
                    className="prop-input"
                    style={{ width: "70px" }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>px</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Spring Settle</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={dropParams.settleStrength ?? 65}
                    onChange={(e) => updateParam("drop-settle", "settleStrength", parseInt(e.target.value, 10) || 65)}
                    style={{ width: "80px", accentColor: "#10b981" }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{dropParams.settleStrength ?? 65}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Paper Slide Reveal Toggle & Controls */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}>
              <input
                type="checkbox"
                checked={isEffectEnabled("paper-slide")}
                onChange={(e) => onUpdateEffect("paper-slide", e.target.checked)}
                style={{ accentColor: "#3b82f6" }}
              />
              <span style={{ fontSize: "12px", fontWeight: 600, color: isEffectEnabled("paper-slide") ? "var(--text-primary)" : "var(--text-muted)" }}>
                Paper Slide Cut Reveal
              </span>
            </label>

            {isEffectEnabled("paper-slide") && (
              <div style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="prop-row">
                  <span className="prop-label">Direction</span>
                  <select
                    className="prop-input"
                    style={{ width: "100px", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    value={slideParams.direction ?? "bottom"}
                    onChange={(e) => updateParam("paper-slide", "direction", e.target.value)}
                  >
                    <option value="bottom">From Bottom</option>
                    <option value="top">From Top</option>
                    <option value="left">From Left</option>
                    <option value="right">From Right</option>
                  </select>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Duration</span>
                  <input
                    type="number"
                    min="6"
                    max="60"
                    value={slideParams.durationFrames ?? 18}
                    onChange={(e) => updateParam("paper-slide", "durationFrames", parseInt(e.target.value, 10) || 18)}
                    className="prop-input"
                    style={{ width: "70px" }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>frames</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editorial Marker & Stagger Typography Effects (For Text Clips) */}
      {selectedClip.type === "text" && (
        <div className="inspector-section" style={{ background: "rgba(254, 240, 138, 0.05)", borderRadius: "var(--radius-md)", padding: "10px" }}>
          <div className="section-label" style={{ color: "#fef08a" }}>Marker & Stagger Reveals</div>

          {/* Marker Highlight */}
          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "4px" }}>
              <input
                type="checkbox"
                checked={isEffectEnabled("text-highlight")}
                onChange={(e) => onUpdateEffect("text-highlight", e.target.checked)}
                style={{ accentColor: "#fef08a" }}
              />
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Marker Highlight Sweep</span>
            </label>
            {isEffectEnabled("text-highlight") && (
              <div style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="prop-row">
                  <span className="prop-label">Color</span>
                  <input
                    type="color"
                    value={highlightParams.highlightColor ?? "#fef08a"}
                    onChange={(e) => updateParam("text-highlight", "highlightColor", e.target.value)}
                    style={{ width: "32px", height: "24px", border: "none", cursor: "pointer", background: "none" }}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">Mode</span>
                  <select
                    className="prop-input"
                    style={{ width: "100px", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    value={highlightParams.mode ?? "sweep"}
                    onChange={(e) => updateParam("text-highlight", "mode", e.target.value)}
                  >
                    <option value="sweep">Brush Sweep</option>
                    <option value="box">Filled Box</option>
                    <option value="underline">Underline</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Staggered Words */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "4px" }}>
              <input
                type="checkbox"
                checked={isEffectEnabled("stagger-words")}
                onChange={(e) => onUpdateEffect("stagger-words", e.target.checked)}
                style={{ accentColor: "#a7f3d0" }}
              />
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Staggered Word Cadence</span>
            </label>
            {isEffectEnabled("stagger-words") && (
              <div style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="prop-row">
                  <span className="prop-label">Delay / Word</span>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={staggerParams.staggerDelay ?? 3}
                    onChange={(e) => updateParam("stagger-words", "staggerDelay", parseInt(e.target.value, 10) || 3)}
                    className="prop-input"
                    style={{ width: "60px" }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>frames</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color Filters */}
      {selectedClip.type !== "audio" && (
        <div className="inspector-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="section-label" style={{ marginBottom: 0 }}>Color Filters</span>
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

          {FILTER_EFFECT_KEYS.map((key) => {
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

      {/* Transitions Section */}
      {selectedClip.type !== "audio" && (
        <div className="inspector-section">
          <div className="section-label">Transitions</div>

          {clipTransitions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
              {clipTransitions.map((t) => {
                const isIncoming = t.toClipId === selectedClip.id;
                const label = EDITORIAL_TRANSITION_TYPES.find((et) => et.type === t.type)?.label || t.type;
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
                    type: "directional-wipe",
                    durationInFrames: Math.min(15, maxTransDuration),
                    trackId: selectedClip.trackId,
                    toClipId: selectedClip.id,
                  })
                }
              >
                + Matte Wipe
              </button>
            </div>

            {nextAdjacentClip && !hasTransitionToNext && (
              <button
                className="btn"
                style={{ fontSize: "11px", padding: "4px 6px", background: "rgba(59, 130, 246, 0.15)", borderColor: "var(--accent)" }}
                disabled={isTrackLocked}
                onClick={() =>
                  onAddTransition({
                    type: "paper-slide",
                    durationInFrames: Math.min(18, maxTransDuration, getMaxTransitionDuration(nextAdjacentClip.durationInFrames)),
                    trackId: selectedClip.trackId,
                    fromClipId: selectedClip.id,
                    toClipId: nextAdjacentClip.id,
                  })
                }
              >
                + Paper Slide Cut to Next Clip
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

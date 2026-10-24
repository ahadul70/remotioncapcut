import React, { useRef, useState } from "react";
import { random } from "remotion";
import {
  Clip,
  EffectType,
  GraphicType,
  MediaAsset,
  SidebarTab,
  TransitionType,
} from "../state/editorTypes";
import { extractMediaMetadata, validateMediaFile } from "../utils/mediaUtils";
import {
  DEFAULT_GRAPHIC_PRESETS,
  EDITORIAL_TRANSITION_TYPES,
} from "../utils/editorialRegistry";

type MediaPanelProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  assets: MediaAsset[];
  fps: number;
  onImportAssets: (assets: MediaAsset[]) => void;
  onAddAssetToTimeline: (asset: MediaAsset) => void;
  onDragAssetStart?: (asset: MediaAsset) => void;
  selectedClip?: Clip | null;
  onApplyTransition?: (type: TransitionType) => void;
  onApplyEffectPreset?: (
    preset: { type: EffectType; value: number; params?: Record<string, unknown> }[]
  ) => void;
  onAddGraphicClip?: (graphicType: GraphicType) => void;
};

export const MediaPanel: React.FC<MediaPanelProps> = ({
  activeTab,
  onTabChange,
  assets,
  fps,
  onImportAssets,
  onAddAssetToTimeline,
  onDragAssetStart,
  selectedClip,
  onApplyTransition,
  onApplyEffectPreset,
  onAddGraphicClip,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importingCount, setImportingCount] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isDragZoneActive, setIsDragZoneActive] = useState(false);

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsImporting(true);
    setImportingCount(files.length);
    const newErrors: string[] = [];
    const newAssets: MediaAsset[] = [];

    for (const file of files) {
      const validation = validateMediaFile(file);
      if (!validation.valid || !validation.mediaType) {
        newErrors.push(validation.error || `Unsupported file format: ${file.name}`);
        continue;
      }

      try {
        const metadata = await extractMediaMetadata(file, fps);
        const objectUrl = URL.createObjectURL(file);
        const rand = random(null).toString(36).substring(2, 6);
        const assetId = `asset-${Date.now().toString(36)}-${rand}`;

        newAssets.push({
          id: assetId,
          name: file.name,
          type: metadata.type,
          src: objectUrl,
          durationInSeconds: metadata.durationInSeconds,
          durationInFrames: metadata.durationInFrames,
          width: metadata.width,
          height: metadata.height,
          fps,
          thumbnail: metadata.thumbnail,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Failed to import "${file.name}"`;
        newErrors.push(message);
      }
    }

    if (newAssets.length > 0) {
      onImportAssets(newAssets);
    }

    if (newErrors.length > 0) {
      setImportErrors((prev) => [...prev, ...newErrors]);
    }

    setIsImporting(false);
    setImportingCount(0);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handlePanelDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragZoneActive(true);
    }
  };

  const handlePanelDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragZoneActive(false);
  };

  const handlePanelDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      setIsDragZoneActive(false);
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <aside className="left-sidebar">
      {/* Vertical Navigation Strip */}
      <nav className="sidebar-nav-strip">
        <button
          className={`nav-tab-btn ${activeTab === "media" ? "active" : ""}`}
          onClick={() => onTabChange("media")}
          title="Media Assets"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
          <span>Media</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "audio" ? "active" : ""}`}
          onClick={() => onTabChange("audio")}
          title="Audio Library"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>Audio</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => onTabChange("text")}
          title="Text & Titles"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <span>Text</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "graphics" ? "active" : ""}`}
          onClick={() => onTabChange("graphics")}
          title="Editorial Graphics & Vox Style"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Graphics</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "captions" ? "active" : ""}`}
          onClick={() => onTabChange("captions")}
          title="Auto Captions"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
          </svg>
          <span>Captions</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "transitions" ? "active" : ""}`}
          onClick={() => onTabChange("transitions")}
          title="Transitions"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 22 22 22" />
          </svg>
          <span>Transitions</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "effects" ? "active" : ""}`}
          onClick={() => onTabChange("effects")}
          title="Effects"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          <span>Effects</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => onTabChange("ai")}
          title="AI Video Assistant"
          style={{ marginTop: "auto" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span style={{ color: "var(--accent)" }}>AI Tools</span>
        </button>
      </nav>

      {/* Tab Content Pane */}
      <div
        className="sidebar-content-pane"
        onDragOver={handlePanelDragOver}
        onDragLeave={handlePanelDragLeave}
        onDrop={handlePanelDrop}
      >
        {activeTab === "media" && (
          <>
            <div className="pane-header">
              <span className="pane-title">Media Library</span>
              <button
                className="btn btn-primary"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                + Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*,.mp4,.webm,.mov,.mkv,.mp3,.wav,.aac,.ogg,.flac,.m4a"
                style={{ display: "none" }}
                onChange={handleFileInputChange}
              />
            </div>

            {/* Error notifications */}
            {importErrors.length > 0 && (
              <div className="media-error-banner">
                <div style={{ flex: 1 }}>
                  {importErrors.map((err, i) => (
                    <div key={i} style={{ marginBottom: i < importErrors.length - 1 ? "4px" : "0" }}>
                      • {err}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-icon"
                  style={{ width: "18px", height: "18px", fontSize: "10px", lineHeight: "1" }}
                  onClick={() => setImportErrors([])}
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Drop / Import Zone */}
            <div
              className={`media-drop-zone ${isDragZoneActive ? "active" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              title="Click to import or drop files here"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 6px", display: "block", color: "var(--accent)" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-primary)" }}>
                {isDragZoneActive ? "Drop files to import" : "Drop files here or click to import"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                Supports MP4, WebM, MOV, MP3, WAV, AAC
              </div>
            </div>

            {/* Loading / Importing indicator */}
            {isImporting && (
              <div className="media-loading-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Analyzing {importingCount} media file{importingCount > 1 ? "s" : ""}...</span>
              </div>
            )}

            {/* Asset cards */}
            <div className="media-asset-list">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="media-card"
                  draggable
                  onDragStart={(e) => {
                    const data = JSON.stringify({
                      type: "media-asset",
                      assetId: asset.id,
                      assetType: asset.type,
                    });
                    e.dataTransfer.setData("application/json", data);
                    e.dataTransfer.setData("text/plain", asset.id);
                    e.dataTransfer.effectAllowed = "copy";
                    if (onDragAssetStart) {
                      onDragAssetStart(asset);
                    }
                  }}
                  onDoubleClick={() => onAddAssetToTimeline(asset)}
                  title="Drag onto timeline or double-click to add"
                >
                  <div className="media-thumb-area">
                    {asset.thumbnail ? (
                      // eslint-disable-next-line @remotion/warn-native-media-tag
                      <img
                        src={asset.thumbnail}
                        alt={asset.name}
                        className="media-thumb-img"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : asset.type === "video" ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    )}
                    <span className="media-badge">
                      {formatDuration(asset.durationInSeconds)}
                    </span>
                  </div>
                  <div className="media-info">
                    <div className="media-filename" title={asset.name}>{asset.name}</div>
                    <div className="media-meta">
                      {asset.type.toUpperCase()} • {asset.durationInFrames}f ({(asset.durationInFrames / fps).toFixed(1)}s)
                    </div>
                    <button
                      className="btn"
                      style={{
                        width: "100%",
                        marginTop: "8px",
                        fontSize: "11px",
                        padding: "4px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAssetToTimeline(asset);
                      }}
                    >
                      + Add to Timeline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "audio" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Audio & Music</span>
              <button
                className="btn btn-primary"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => audioFileInputRef.current?.click()}
              >
                + Import Audio
              </button>
              <input
                ref={audioFileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a"
                style={{ display: "none" }}
                onChange={handleFileInputChange}
              />
            </div>

            {/* Error notifications */}
            {importErrors.length > 0 && (
              <div className="media-error-banner">
                <div style={{ flex: 1 }}>
                  {importErrors.map((err, i) => (
                    <div key={i} style={{ marginBottom: i < importErrors.length - 1 ? "4px" : "0" }}>
                      • {err}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-icon"
                  style={{ width: "18px", height: "18px", fontSize: "10px" }}
                  onClick={() => setImportErrors([])}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Audio assets list */}
            {assets.filter((a) => a.type === "audio").length > 0 ? (
              <div className="media-asset-list">
                {assets
                  .filter((a) => a.type === "audio")
                  .map((asset) => (
                    <div
                      key={asset.id}
                      className="media-card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            type: "media-asset",
                            assetId: asset.id,
                            assetType: asset.type,
                          })
                        );
                        e.dataTransfer.effectAllowed = "copy";
                        if (onDragAssetStart) {
                          onDragAssetStart(asset);
                        }
                      }}
                      onDoubleClick={() => onAddAssetToTimeline(asset)}
                    >
                      <div className="media-thumb-area" style={{ height: "60px", background: "rgba(52, 211, 153, 0.1)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                        <span className="media-badge">
                          {formatDuration(asset.durationInSeconds)}
                        </span>
                      </div>
                      <div className="media-info">
                        <div className="media-filename" title={asset.name}>{asset.name}</div>
                        <div className="media-meta">
                          AUDIO • {asset.durationInFrames}f ({(asset.durationInFrames / fps).toFixed(1)}s)
                        </div>
                        <button
                          className="btn"
                          style={{ width: "100%", marginTop: "6px", fontSize: "11px", padding: "4px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddAssetToTimeline(asset);
                          }}
                        >
                          + Add to Audio Track
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 12px" }}>
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Audio Library Ready
                </p>
                <p style={{ fontSize: "11px", marginBottom: "16px" }}>
                  Import your voice-over, background music, or SFX.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => audioFileInputRef.current?.click()}
                >
                  Import Audio File
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Text Presets</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {["Basic Title", "Subtitle", "Lower Third", "Callout Banner"].map((preset) => (
                <div
                  key={preset}
                  style={{
                    padding: "10px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{preset}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-hover)", padding: "2px 6px", borderRadius: "3px" }}>
                    Preset
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "graphics" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Editorial Graphics (Vox Style)</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Insert business explainer and documentary motion graphic cards directly onto the timeline.
            </div>

            {/* Explanatory Data Graphics */}
            <div className="section-label" style={{ marginBottom: "8px" }}>Data & Explanatory Cards</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {DEFAULT_GRAPHIC_PRESETS.map((preset) => (
                <div
                  key={preset.type}
                  style={{
                    padding: "12px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {preset.title}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {preset.description}
                      </div>
                    </div>
                    <span style={{ fontSize: "9px", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", padding: "2px 6px", borderRadius: "3px", fontWeight: 600 }}>
                      EDITORIAL
                    </span>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "11px", padding: "6px" }}
                    onClick={() => onAddGraphicClip && onAddGraphicClip(preset.type)}
                  >
                    + Add to Timeline
                  </button>
                </div>
              ))}
            </div>

            {/* Physical Paper Styles */}
            <div className="section-label" style={{ marginBottom: "8px" }}>Physical Paper-Cutout Styles</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
              {selectedClip
                ? `Apply tactile paper physics to "${selectedClip.name}"`
                : "Select a visual clip or graphic to apply paper styles"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                {
                  title: "Paper Cutout",
                  desc: "Matte border & tape",
                  effects: [{ type: "paper-cutout" as const, value: 70, params: { borderWidth: 8, tiltAngle: -2.5, tapeStyle: "corners" } }],
                },
                {
                  title: "Drop & Settle",
                  desc: "Mechanical inertia bounce",
                  effects: [{ type: "drop-settle" as const, value: 65, params: { startOffsetY: 180, settleStrength: 65, durationFrames: 24 } }],
                },
                {
                  title: "Paper Slide Cut",
                  desc: "Paper reveal wipe",
                  effects: [{ type: "paper-slide" as const, value: 50, params: { direction: "bottom", durationFrames: 18 } }],
                },
                {
                  title: "Highlighter Sweep",
                  desc: "Matte yellow reveal",
                  effects: [{ type: "text-highlight" as const, value: 80, params: { highlightColor: "#fef08a", mode: "sweep" } }],
                },
              ].map((stylePreset) => (
                <button
                  key={stylePreset.title}
                  className="btn"
                  disabled={!selectedClip}
                  onClick={() => onApplyEffectPreset && onApplyEffectPreset(stylePreset.effects)}
                  style={{
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "2px",
                    textAlign: "left",
                    height: "auto",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>{stylePreset.title}</span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{stylePreset.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "captions" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Auto Captions</span>
            </div>
            <div style={{ padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <p style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "6px" }}>
                Speech to Text
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                Remotion Whispers & Caption generator engine integration.
              </p>
              <button className="btn" disabled style={{ width: "100%", fontSize: "12px" }}>
                Generate Captions (Planned)
              </button>
            </div>
          </div>
        )}

        {activeTab === "transitions" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Transitions</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              {selectedClip
                ? `Click a transition to apply to "${selectedClip.name}"`
                : "Select a clip on the timeline to apply transitions"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {EDITORIAL_TRANSITION_TYPES.map((t) => (
                <div
                  key={t.type}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{t.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{t.description}</div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: "10px", padding: "4px 8px" }}
                    disabled={!selectedClip}
                    onClick={() => onApplyTransition && onApplyTransition(t.type)}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "effects" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Effect Presets</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              {selectedClip
                ? `Click to apply visual effect to "${selectedClip.name}"`
                : "Select a clip on the timeline to apply visual effects"}
            </div>

            {/* Vox Editorial Physical Presets */}
            <div className="section-label" style={{ marginBottom: "8px" }}>Vox Editorial Physics Presets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              {[
                {
                  title: "Evidence Document",
                  effects: [
                    { type: "paper-cutout" as const, value: 70, params: { borderWidth: 8, tiltAngle: -2.5, tapeStyle: "corners" } },
                    { type: "drop-settle" as const, value: 65, params: { startOffsetY: 180, settleStrength: 65, durationFrames: 24 } },
                  ],
                },
                {
                  title: "Paper Slide Cut",
                  effects: [
                    { type: "paper-slide" as const, value: 50, params: { direction: "bottom", durationFrames: 18 } },
                    { type: "contrast" as const, value: 110 },
                  ],
                },
                {
                  title: "Archival Tape Card",
                  effects: [
                    { type: "paper-cutout" as const, value: 80, params: { borderWidth: 10, tiltAngle: 1.8, tapeStyle: "top-center" } },
                  ],
                },
                {
                  title: "Marker Highlight",
                  effects: [
                    { type: "text-highlight" as const, value: 80, params: { highlightColor: "#fef08a", mode: "sweep" } },
                  ],
                },
              ].map((preset) => (
                <button
                  key={preset.title}
                  className="btn"
                  disabled={!selectedClip}
                  onClick={() => onApplyEffectPreset && onApplyEffectPreset(preset.effects)}
                  style={{
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    textAlign: "center",
                    height: "auto",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#f59e0b" }}>{preset.title}</span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Vox Preset</span>
                </button>
              ))}
            </div>

            {/* Color & Filter Presets */}
            <div className="section-label" style={{ marginBottom: "8px" }}>Color & Grading Presets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                {
                  title: "Vibrant Pop",
                  effects: [
                    { type: "saturation" as const, value: 140 },
                    { type: "contrast" as const, value: 115 },
                  ],
                },
                {
                  title: "Cinematic Noir",
                  effects: [
                    { type: "grayscale" as const, value: 100 },
                    { type: "contrast" as const, value: 125 },
                  ],
                },
                {
                  title: "Moody Vignette",
                  effects: [
                    { type: "vignette" as const, value: 60 },
                    { type: "contrast" as const, value: 110 },
                  ],
                },
                {
                  title: "Soft Focus",
                  effects: [
                    { type: "blur" as const, value: 3 },
                    { type: "brightness" as const, value: 105 },
                  ],
                },
                {
                  title: "High Contrast",
                  effects: [
                    { type: "contrast" as const, value: 150 },
                    { type: "brightness" as const, value: 100 },
                  ],
                },
                {
                  title: "Summer Warmth",
                  effects: [
                    { type: "brightness" as const, value: 110 },
                    { type: "saturation" as const, value: 125 },
                    { type: "vignette" as const, value: 25 },
                  ],
                },
              ].map((preset) => (
                <button
                  key={preset.title}
                  className="btn"
                  disabled={!selectedClip}
                  onClick={() => onApplyEffectPreset && onApplyEffectPreset(preset.effects)}
                  style={{
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    textAlign: "center",
                    height: "auto",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{preset.title}</span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Apply Preset</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div>
            <div className="pane-header">
              <span className="pane-title" style={{ color: "var(--accent)" }}>AI Video Assistant</span>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <div className="section-label">Script & Story</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {["Generate Script from Topic", "Improve Hook & Intro", "Create Shot List"].map((item) => (
                  <button key={item} className="btn" style={{ justifyContent: "flex-start", width: "100%", fontSize: "11px" }}>
                    ✦ {item}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div className="section-label">Editing Assistant</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {["Suggest Cuts at Pauses", "Remove Silent Gaps", "Find Highlight Moments"].map((item) => (
                  <button key={item} className="btn" style={{ justifyContent: "flex-start", width: "100%", fontSize: "11px" }}>
                    ✦ {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">Creator Tools</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {["Generate Captions", "Suggest B-Roll Assets", "Voice-Over Plan"].map((item) => (
                  <button key={item} className="btn" style={{ justifyContent: "flex-start", width: "100%", fontSize: "11px" }}>
                    ✦ {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

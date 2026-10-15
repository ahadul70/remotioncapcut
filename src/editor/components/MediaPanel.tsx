import React, { useRef } from "react";
import { MediaAsset, SidebarTab } from "../state/editorTypes";

type MediaPanelProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  assets: MediaAsset[];
  onImportAsset: (asset: MediaAsset) => void;
  onAddAssetToTimeline: (asset: MediaAsset) => void;
};

export const MediaPanel: React.FC<MediaPanelProps> = ({
  activeTab,
  onTabChange,
  assets,
  onImportAsset,
  onAddAssetToTimeline,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video");

    const newAsset: MediaAsset = {
      id: `asset-${Date.now()}`,
      name: file.name,
      type: isVideo ? "video" : "audio",
      src: objectUrl,
      durationInSeconds: 10,
      durationInFrames: 300,
      fps: 30,
    };

    onImportAsset(newAsset);
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
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span>Transition</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "effects" ? "active" : ""}`}
          onClick={() => onTabChange("effects")}
          title="Video Effects"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
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
      <div className="sidebar-content-pane">
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
                accept="video/*,audio/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {/* Asset cards */}
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="media-card"
                onDoubleClick={() => onAddAssetToTimeline(asset)}
              >
                <div className="media-thumb-area">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <span className="media-badge">
                    {Math.floor(asset.durationInSeconds / 60)}:
                    {String(Math.floor(asset.durationInSeconds % 60)).padStart(2, "0")}
                  </span>
                </div>
                <div className="media-info">
                  <div className="media-filename">{asset.name}</div>
                  <div className="media-meta">
                    {asset.type.toUpperCase()} • {asset.durationInFrames} frames • 30 fps
                  </div>
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      fontSize: "11px",
                      padding: "4px",
                    }}
                    onClick={() => onAddAssetToTimeline(asset)}
                  >
                    + Add to Timeline
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "audio" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Audio & Music</span>
            </div>
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
                onClick={() => fileInputRef.current?.click()}
              >
                Import Audio File
              </button>
            </div>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["Cross Fade", "Wipe Left", "Slide Up", "Zoom In"].map((t) => (
                <div
                  key={t}
                  style={{
                    padding: "16px 8px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    textAlign: "center",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "effects" && (
          <div>
            <div className="pane-header">
              <span className="pane-title">Video Effects</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["Color Balance", "Gaussian Blur", "Vignette", "Grain"].map((e) => (
                <div
                  key={e}
                  style={{
                    padding: "16px 8px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    textAlign: "center",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {e}
                </div>
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

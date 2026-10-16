import React, { useRef } from "react";
import { PlayerRef } from "@remotion/player";
import { EditorState, MediaAsset } from "../state/editorTypes";
import { TimelineRuler } from "./TimelineRuler";
import { TimelineTrack } from "./TimelineTrack";
import { useCurrentPlayerFrame } from "../hooks/useCurrentPlayerFrame";

type TimelineProps = {
  state: EditorState;
  playerRef: React.RefObject<PlayerRef | null>;
  onSeek: (frame: number) => void;
  onSelectClip: (id: string | null) => void;
  onMoveStart: () => void;
  onMoveClip: (id: string, newStartFrame: number) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onTrimBegin: () => void;
  onTrimStart: (id: string, newStartFrame: number) => void;
  onTrimEnd: (id: string, newDurationInFrames: number) => void;
  onCommitTrim: () => void;
  onCancelTrim: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onToggleSnapping: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleLock: (trackId: string) => void;
  onToggleVisible: (trackId: string) => void;
  onDropAsset?: (trackId: string, frame: number, asset: MediaAsset) => void;
  onDropFiles?: (trackId: string, frame: number, files: FileList) => void;
};

export const Timeline: React.FC<TimelineProps> = ({
  state,
  playerRef,
  onSeek,
  onSelectClip,
  onMoveStart,
  onMoveClip,
  onCommitMove,
  onCancelMove,
  onTrimBegin,
  onTrimStart,
  onTrimEnd,
  onCommitTrim,
  onCancelTrim,
  onSplit,
  onDelete,
  onToggleSnapping,
  onZoomChange,
  onToggleMute,
  onToggleLock,
  onToggleVisible,
  onDropAsset,
  onDropFiles,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Directly subscribe to player frame updates without top-level re-render overhead
  const currentFrame = useCurrentPlayerFrame(playerRef, state.currentFrame);

  const totalWidthPx = Math.max(1400, state.totalDurationInFrames * state.zoom + 500);
  const playheadLeftPx = currentFrame * state.zoom;

  // Fit timeline to content calculation
  const handleFitToContent = () => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 80;
    const computedZoom = Math.max(0.2, Math.min(10, +(containerWidth / state.totalDurationInFrames).toFixed(2)));
    onZoomChange(computedZoom);
  };

  // Playhead scrubber drag
  const handlePlayheadPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialFrame = currentFrame;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / state.zoom);
      onSeek(Math.max(0, Math.min(state.totalDurationInFrames, initialFrame + deltaFrames)));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Canvas click handler: deselect clips when clicking empty area, and seek to clicked horizontal position
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't deselect or seek if clicked inside a clip, ruler, or playhead
    if (
      target.closest(".timeline-clip") ||
      target.closest(".time-ruler") ||
      target.closest(".playhead-head") ||
      target.closest(".trim-handle")
    ) {
      return;
    }

    onSelectClip(null);

    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      const targetFrame = Math.max(0, Math.min(state.totalDurationInFrames, Math.round(clickX / state.zoom)));
      onSeek(targetFrame);
    }
  };

  return (
    <footer className="timeline-workspace">
      {/* Timeline Toolbar */}
      <div className="timeline-toolbar">
        <div className="toolbar-tools">
          <button
            className={`btn btn-icon btn-tool ${state.activeTool === "select" ? "active" : ""}`}
            title="Selection Tool (V)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </button>

          <button
            className="btn btn-icon btn-tool"
            disabled={!state.selectedClipId}
            onClick={onSplit}
            title="Split Clip at Playhead (S)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          <button
            className="btn btn-icon btn-danger"
            disabled={!state.selectedClipId}
            onClick={onDelete}
            title="Delete Selected Clip (Del)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>

          <div style={{ width: "1px", height: "18px", background: "var(--border-color)", margin: "0 4px" }} />

          <button
            className={`btn btn-icon btn-tool ${state.snappingEnabled ? "active" : ""}`}
            onClick={onToggleSnapping}
            title="Toggle Snapping"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3v7a6 6 0 0 0 12 0V3" />
              <line x1="6" y1="7" x2="18" y2="7" />
            </svg>
          </button>
        </div>

        <div className="toolbar-zoom">
          <button
            className="btn btn-icon"
            onClick={() => onZoomChange(Math.max(0.2, +(state.zoom - (state.zoom > 1 ? 0.5 : 0.1)).toFixed(2)))}
            title="Zoom Out (-)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <input
            type="range"
            min="0.2"
            max="10"
            step="0.1"
            style={{ width: "80px", accentColor: "var(--accent)" }}
            value={state.zoom}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            title={`Timeline Zoom: ${state.zoom.toFixed(1)} px/frame`}
          />

          <button
            className="btn btn-icon"
            onClick={() => onZoomChange(Math.min(10, +(state.zoom + (state.zoom >= 1 ? 0.5 : 0.1)).toFixed(2)))}
            title="Zoom In (+)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            className="btn"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={handleFitToContent}
            title="Fit to Content"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Main Timeline Body */}
      <div className="timeline-body">
        {/* Left: Fixed Track Headers */}
        <div className="track-headers-column">
          <div className="track-header-spacer" />
          {state.tracks.map((track) => (
            <div key={track.id} className="track-header-item">
              <div className="track-header-title">
                {track.type === "video" ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                  </svg>
                )}
                <span>{track.name}</span>
              </div>

              <div className="track-header-controls">
                {track.type === "video" && (
                  <button
                    className="btn btn-icon"
                    style={{ width: "22px", height: "22px" }}
                    onClick={() => onToggleVisible(track.id)}
                    title="Toggle Visibility"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={track.visible === false ? "var(--danger)" : "currentColor"} strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}

                {track.type === "audio" && (
                  <button
                    className="btn btn-icon"
                    style={{ width: "22px", height: "22px" }}
                    onClick={() => onToggleMute(track.id)}
                    title="Toggle Mute"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={track.muted ? "var(--danger)" : "currentColor"} strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    </svg>
                  </button>
                )}

                <button
                  className="btn btn-icon"
                  style={{ width: "22px", height: "22px" }}
                  onClick={() => onToggleLock(track.id)}
                  title="Lock Track"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={track.locked ? "var(--warning)" : "currentColor"} strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Scrollable Canvas & Ruler Container */}
        <div
          ref={scrollContainerRef}
          className="timeline-canvas-scroll-container"
          onClick={handleCanvasClick}
        >
          <TimelineRuler
            totalDurationInFrames={state.totalDurationInFrames}
            zoom={state.zoom}
            fps={state.fps}
            onSeek={onSeek}
          />

          {/* Track Lanes */}
          {state.tracks.map((track) => (
            <TimelineTrack
              key={track.id}
              track={track}
              clips={state.clips}
              zoom={state.zoom}
              selectedClipId={state.selectedClipId}
              onSelectClip={onSelectClip}
              onMoveStart={onMoveStart}
              onMoveClip={onMoveClip}
              onCommitMove={onCommitMove}
              onCancelMove={onCancelMove}
              onTrimBegin={onTrimBegin}
              onTrimStart={onTrimStart}
              onTrimEnd={onTrimEnd}
              onCommitTrim={onCommitTrim}
              onCancelTrim={onCancelTrim}
              totalWidthPx={totalWidthPx}
              allAssets={state.assets}
              onDropAsset={onDropAsset}
              onDropFiles={onDropFiles}
            />
          ))}

          {/* Interactive Playhead Line & Scrubber */}
          <div
            className="playhead-line"
            style={{
              left: `${playheadLeftPx}px`,
            }}
          >
            <div
              className="playhead-head"
              onPointerDown={handlePlayheadPointerDown}
              onClick={(e) => e.stopPropagation()}
              title="Drag playhead"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { VideoComposition } from "../../Composition";
import { EditorState } from "../state/editorTypes";

type PreviewPanelProps = {
  state: EditorState;
  onFrameChange: (frame: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  playerRef: React.RefObject<PlayerRef | null>;
};

function formatTimecode(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const framePart = frames % fps;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(framePart).padStart(2, "0")}`;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  state,
  onFrameChange,
  onPlayingChange,
  playerRef,
}) => {
  const [scaleMode, setScaleMode] = useState<"fit" | "50%" | "100%">("fit");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal player events to editor state
  useEffect(() => {
    const current = playerRef.current;
    if (!current) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      onFrameChange(e.detail.frame);
    };

    const handlePlay = () => onPlayingChange(true);
    const handlePause = () => onPlayingChange(false);

    current.addEventListener("frameupdate", handleFrameUpdate);
    current.addEventListener("play", handlePlay);
    current.addEventListener("pause", handlePause);

    return () => {
      current.removeEventListener("frameupdate", handleFrameUpdate);
      current.removeEventListener("play", handlePlay);
      current.removeEventListener("pause", handlePause);
    };
  }, [playerRef, onFrameChange, onPlayingChange]);

  const togglePlay = () => {
    if (playerRef.current) {
      if (playerRef.current.isPlaying()) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
  };

  const stepFrame = (delta: number) => {
    if (playerRef.current) {
      const nextFrame = Math.max(0, Math.min(state.currentFrame + delta, state.totalDurationInFrames));
      playerRef.current.seekTo(nextFrame);
      onFrameChange(nextFrame);
    }
  };

  // Determine stage sizing for 9:16 vertical video
  let stageWidth = "220px";
  let stageHeight = "390px";
  if (scaleMode === "100%") {
    stageWidth = "360px";
    stageHeight = "640px";
  } else if (scaleMode === "50%") {
    stageWidth = "180px";
    stageHeight = "320px";
  }

  return (
    <section className="preview-stage">
      {/* Central Canvas Stage */}
      <div className="preview-canvas-container" ref={containerRef}>
        <div
          className="player-wrapper"
          style={{
            width: stageWidth,
            height: stageHeight,
          }}
        >
          <Player
            ref={playerRef}
            component={VideoComposition}
            inputProps={{ clips: state.clips }}
            durationInFrames={Math.max(60, state.totalDurationInFrames)}
            compositionWidth={state.width}
            compositionHeight={state.height}
            fps={state.fps}
            style={{
              width: "100%",
              height: "100%",
            }}
            controls={false}
            loop
          />
        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="preview-control-bar">
        {/* Left: Timecode */}
        <div className="timecode-display">
          <span className="timecode-current">
            {formatTimecode(state.currentFrame, state.fps)}
          </span>
          <span style={{ margin: "0 4px", color: "var(--text-muted)" }}>/</span>
          <span>{formatTimecode(state.totalDurationInFrames, state.fps)}</span>
        </div>

        {/* Middle: Controls */}
        <div className="playback-buttons">
          <button
            className="btn btn-icon"
            onClick={() => stepFrame(-1)}
            title="Previous Frame (Left Arrow)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button
            className="btn btn-icon"
            onClick={togglePlay}
            style={{
              width: "34px",
              height: "34px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              borderColor: "var(--accent)",
            }}
            title="Play / Pause (Space)"
          >
            {state.isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: "2px" }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button
            className="btn btn-icon"
            onClick={() => stepFrame(1)}
            title="Next Frame (Right Arrow)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>

        {/* Right: Scale & Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={scaleMode}
            onChange={(e) => setScaleMode(e.target.value as "fit" | "50%" | "100%")}
            style={{
              padding: "4px 8px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <option value="fit">Fit View</option>
            <option value="100%">100%</option>
            <option value="50%">50%</option>
          </select>

          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            1080×1920
          </span>
        </div>
      </div>
    </section>
  );
};

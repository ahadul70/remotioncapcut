/* eslint-disable @remotion/non-pure-animation */
import React, { useRef } from "react";
import { Clip, ClipTransition } from "../state/editorTypes";
import { ClipFilmstrip } from "./ClipFilmstrip";
import { ClipWaveform } from "./ClipWaveform";

type TimelineClipProps = {
  clip: Clip;
  zoom: number;
  fps: number;
  isSelected: boolean;
  isLocked?: boolean;
  transitions?: ClipTransition[];
  selectedTransitionId?: string | null;
  onSelect: (id: string) => void;
  onSelectTransition?: (id: string) => void;
  onMoveStart: () => void;
  onMove: (id: string, newStartFrame: number, targetTrackId?: string) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onTrimBegin: () => void;
  onTrimStart: (id: string, newStartFrame: number) => void;
  onTrimEnd: (id: string, newDurationInFrames: number) => void;
  onCommitTrim: () => void;
  onCancelTrim: () => void;
};

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  zoom,
  fps,
  isSelected,
  isLocked,
  transitions = [],
  selectedTransitionId,
  onSelect,
  onSelectTransition,
  onMoveStart,
  onMove,
  onCommitMove,
  onCancelMove,
  onTrimBegin,
  onTrimStart,
  onTrimEnd,
  onCommitTrim,
  onCancelTrim,
}) => {
  const clipRef = useRef<HTMLDivElement>(null);

  const leftPx = clip.timelineStartFrame * zoom;
  const widthPx = Math.max(16, clip.durationInFrames * zoom);

  // Transition regions
  const transIn = transitions.find((t) => t.toClipId === clip.id);
  const transOut = transitions.find((t) => t.fromClipId === clip.id);
  const hasActiveEffects = (clip.effects?.length ?? 0) > 0 && clip.effects?.some((e) => e.enabled);

  // Drag-to-move listener
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    // If clicking a trim handle or transition zone, don't trigger move
    const target = e.target as HTMLElement;
    if (target.classList.contains("trim-handle") || target.closest(".transition-zone")) return;

    e.stopPropagation();
    onSelect(clip.id);

    // Reject move if clip's track is locked
    if (isLocked) return;

    const startX = e.clientX;
    const initialStart = clip.timelineStartFrame;
    let hasMoved = false;

    // Capture pre-move snapshot in history
    onMoveStart();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / zoom);

      // Detect hovering track lane for vertical cross-track moving
      let targetTrackId = clip.trackId;
      const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const laneEl = elements.find((el) => el.classList.contains("track-lane"));
      if (laneEl) {
        const laneTrackId = laneEl.getAttribute("data-track-id");
        const laneTrackType = laneEl.getAttribute("data-track-type");
        const laneIsLocked = laneEl.getAttribute("data-track-locked") === "true";
        if (laneTrackId && laneTrackType === clip.type && !laneIsLocked) {
          targetTrackId = laneTrackId;
        }
      }

      if (Math.abs(deltaFrames) > 0 || targetTrackId !== clip.trackId) {
        hasMoved = true;
        onMove(clip.id, initialStart + deltaFrames, targetTrackId);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (hasMoved) {
        onCommitMove();
      } else {
        onCancelMove();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Left Trim Listener (Head)
  const handleLeftTrimPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isLocked) return;

    const startX = e.clientX;
    const initialStart = clip.timelineStartFrame;
    let hasMoved = false;

    onTrimBegin();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / zoom);
      if (Math.abs(deltaFrames) > 0) {
        hasMoved = true;
        onTrimStart(clip.id, initialStart + deltaFrames);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (hasMoved) {
        onCommitTrim();
      } else {
        onCancelTrim();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Right Trim Listener (Tail)
  const handleRightTrimPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isLocked) return;

    const startX = e.clientX;
    const initialDuration = clip.durationInFrames;
    let hasMoved = false;

    onTrimBegin();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / zoom);
      if (Math.abs(deltaFrames) > 0) {
        hasMoved = true;
        onTrimEnd(clip.id, initialDuration + deltaFrames);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (hasMoved) {
        onCommitTrim();
      } else {
        onCancelTrim();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const inWidthPx = transIn ? Math.max(12, Math.min(widthPx / 2, transIn.durationInFrames * zoom)) : 0;
  const outWidthPx = transOut ? Math.max(12, Math.min(widthPx / 2, transOut.durationInFrames * zoom)) : 0;

  return (
    <div
      ref={clipRef}
      className={`timeline-clip ${clip.type} ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      onPointerDown={handleBodyPointerDown}
      onDragOver={(e) => {
        // Prevent default so browser allows dropping onto tracks even when hovering over existing clips
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
    >
      {/* Left Trim Handle (only enabled when not locked) */}
      {!isLocked && (
        <div
          className="trim-handle left"
          onPointerDown={handleLeftTrimPointerDown}
          onClick={(e) => e.stopPropagation()}
          title="Drag to trim start"
        />
      )}

      {/* Visual media underlay: Filmstrip for video clips, Waveform for audio clips */}
      {clip.type === "video" && (
        <ClipFilmstrip clip={clip} zoom={zoom} />
      )}
      {clip.type === "audio" && (
        <ClipWaveform clip={clip} widthPx={widthPx} />
      )}

      {/* Incoming Transition Zone */}
      {transIn && inWidthPx > 0 && (
        <div
          className={`transition-zone in ${selectedTransitionId === transIn.id ? "selected" : ""}`}
          style={{ width: `${inWidthPx}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTransition?.(transIn.id);
          }}
          title={`Transition In: ${transIn.type} (${transIn.durationInFrames}f)`}
        >
          <span className="transition-icon">⧗</span>
        </div>
      )}

      {/* Outgoing Transition Zone */}
      {transOut && outWidthPx > 0 && (
        <div
          className={`transition-zone out ${selectedTransitionId === transOut.id ? "selected" : ""}`}
          style={{ width: `${outWidthPx}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTransition?.(transOut.id);
          }}
          title={`Transition Out: ${transOut.type} (${transOut.durationInFrames}f)`}
        >
          <span className="transition-icon">⧗</span>
        </div>
      )}

      {/* Clip Content Overlay (Label, Lock badge, Duration, FX Badge) */}
      <div className="clip-content">
        {isLocked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "5px", flexShrink: 0, opacity: 0.85 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        <span style={{ fontWeight: 600 }}>{clip.name}</span>
        {hasActiveEffects && (
          <span className="clip-fx-badge" title="Active Effects">FX</span>
        )}
        {widthPx > 80 && (
          <span style={{ opacity: 0.7, marginLeft: "6px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
            {(clip.durationInFrames / fps).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Right Trim Handle (only enabled when not locked) */}
      {!isLocked && (
        <div
          className="trim-handle right"
          onPointerDown={handleRightTrimPointerDown}
          onClick={(e) => e.stopPropagation()}
          title="Drag to trim end"
        />
      )}
    </div>
  );
};

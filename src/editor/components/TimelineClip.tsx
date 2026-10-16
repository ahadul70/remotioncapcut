import React, { useRef } from "react";
import { Clip } from "../state/editorTypes";

type TimelineClipProps = {
  clip: Clip;
  zoom: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMoveStart: () => void;
  onMove: (id: string, newStartFrame: number) => void;
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
  isSelected,
  onSelect,
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

  // Drag-to-move listener
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    // If clicking a trim handle, don't trigger move
    if ((e.target as HTMLElement).classList.contains("trim-handle")) return;

    e.stopPropagation();
    onSelect(clip.id);

    const startX = e.clientX;
    const initialStart = clip.timelineStartFrame;
    let hasMoved = false;

    // Capture pre-move snapshot in history
    onMoveStart();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFrames = Math.round(deltaX / zoom);
      if (Math.abs(deltaFrames) > 0) {
        hasMoved = true;
        onMove(clip.id, initialStart + deltaFrames);
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

  // Left trim handle listener
  const handleLeftTrimPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(clip.id);

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

  // Right trim handle listener
  const handleRightTrimPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(clip.id);

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

  return (
    <div
      ref={clipRef}
      className={`timeline-clip ${clip.type} ${isSelected ? "selected" : ""}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      onPointerDown={handleBodyPointerDown}
    >
      {/* Left Trim Handle */}
      <div
        className="trim-handle left"
        onPointerDown={handleLeftTrimPointerDown}
        title="Drag to trim start"
      />

      {/* Clip Content */}
      <div className="clip-content">
        <span style={{ fontWeight: 600 }}>{clip.name}</span>
        {widthPx > 80 && (
          <span style={{ opacity: 0.7, marginLeft: "6px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
            {(clip.durationInFrames / 30).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Right Trim Handle */}
      <div
        className="trim-handle right"
        onPointerDown={handleRightTrimPointerDown}
        title="Drag to trim end"
      />
    </div>
  );
};

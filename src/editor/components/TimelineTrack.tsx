import React, { useRef, useState } from "react";
import { Clip, MediaAsset, Track } from "../state/editorTypes";
import { TimelineClip } from "./TimelineClip";
import { calculateDropFrame } from "../utils/mediaUtils";

type TimelineTrackProps = {
  track: Track;
  clips: Clip[];
  zoom: number;
  fps: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onMoveStart: () => void;
  onMoveClip: (id: string, newStartFrame: number, targetTrackId?: string) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onTrimBegin: () => void;
  onTrimStart: (id: string, newStartFrame: number) => void;
  onTrimEnd: (id: string, newDurationInFrames: number) => void;
  onCommitTrim: () => void;
  onCancelTrim: () => void;
  totalWidthPx: number;
  allAssets: MediaAsset[];
  transitions?: import("../state/editorTypes").ClipTransition[];
  selectedTransitionId?: string | null;
  onSelectTransition?: (id: string) => void;
  onDropAsset?: (trackId: string, frame: number, asset: MediaAsset) => void;
  onDropFiles?: (trackId: string, frame: number, files: FileList) => void;
};

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  clips,
  zoom,
  fps,
  selectedClipId,
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
  totalWidthPx,
  allAssets,
  transitions = [],
  selectedTransitionId,
  onSelectTransition,
  onDropAsset,
  onDropFiles,
}) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropFrame, setDropFrame] = useState<number | null>(null);

  const trackClips = clips.filter((c) => c.trackId === track.id);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (track.locked) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);

    if (laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect();
      const frame = calculateDropFrame(e.clientX, rect.left, 0, zoom);
      setDropFrame(frame);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDropFrame(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (track.locked) return;

    let targetFrame = dropFrame ?? 0;
    if (laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect();
      targetFrame = calculateDropFrame(e.clientX, rect.left, 0, zoom);
    }
    setDropFrame(null);

    // Native files dragged from Windows Explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDropFiles) {
        onDropFiles(track.id, targetFrame, e.dataTransfer.files);
      }
      return;
    }

    // Media asset dragged from MediaPanel
    try {
      const dataStr = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
      if (dataStr) {
        let assetId: string | undefined;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed && parsed.assetId) {
            assetId = parsed.assetId;
          }
        } catch {
          // Plain assetId string fallback
          assetId = dataStr.trim();
        }

        if (assetId) {
          const asset = allAssets.find((a) => a.id === assetId);
          if (asset && onDropAsset) {
            onDropAsset(track.id, targetFrame, asset);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  };

  return (
    <div
      ref={laneRef}
      className={`track-lane ${isDragOver ? "drag-over" : ""} ${track.locked ? "locked" : ""}`}
      data-track-id={track.id}
      data-track-type={track.type}
      data-track-locked={track.locked ? "true" : "false"}
      style={{
        width: `${totalWidthPx}px`,
        opacity: track.visible === false ? 0.35 : 1,
        position: "relative",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Target Indicator */}
      {isDragOver && dropFrame !== null && (
        <>
          <div
            className="track-drop-indicator"
            style={{ left: `${dropFrame * zoom}px` }}
          />
          <div
            className="track-drop-badge"
            style={{ left: `${dropFrame * zoom}px` }}
          >
            {dropFrame}f ({(dropFrame / 30).toFixed(1)}s)
          </div>
        </>
      )}

      {/* Track Clips */}
      {trackClips.map((clip) => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          zoom={zoom}
          fps={fps}
          isSelected={clip.id === selectedClipId}
          isLocked={track.locked}
          transitions={transitions}
          selectedTransitionId={selectedTransitionId}
          onSelect={onSelectClip}
          onSelectTransition={onSelectTransition}
          onMoveStart={onMoveStart}
          onMove={onMoveClip}
          onCommitMove={onCommitMove}
          onCancelMove={onCancelMove}
          onTrimBegin={onTrimBegin}
          onTrimStart={onTrimStart}
          onTrimEnd={onTrimEnd}
          onCommitTrim={onCommitTrim}
          onCancelTrim={onCancelTrim}
        />
      ))}
    </div>
  );
};

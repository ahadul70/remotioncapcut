import React from "react";
import { Clip, Track } from "../state/editorTypes";
import { TimelineClip } from "./TimelineClip";

type TimelineTrackProps = {
  track: Track;
  clips: Clip[];
  zoom: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onMoveStart: () => void;
  onMoveClip: (id: string, newStartFrame: number) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onTrimBegin: () => void;
  onTrimStart: (id: string, newStartFrame: number) => void;
  onTrimEnd: (id: string, newDurationInFrames: number) => void;
  onCommitTrim: () => void;
  onCancelTrim: () => void;
  totalWidthPx: number;
};

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  clips,
  zoom,
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
}) => {
  const trackClips = clips.filter((c) => c.trackId === track.id);

  return (
    <div
      className="track-lane"
      style={{
        width: `${totalWidthPx}px`,
        opacity: track.visible === false ? 0.35 : 1,
      }}
    >
      {trackClips.map((clip) => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          zoom={zoom}
          isSelected={clip.id === selectedClipId}
          onSelect={onSelectClip}
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

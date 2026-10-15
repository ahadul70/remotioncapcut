import React, { useState } from "react";
import {
  CalculateMetadataFunction,
  Composition,
  Sequence,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";

type Clip = {
  id: string;
  src: string;
  trackIndex: number;
  start: number; // in frames
  duration: number; // in frames
  sourceStart: number; // in frames
};

type Props = {
  initialDurationFrames?: number;
};

const calculateMetadata: CalculateMetadataFunction<Props> = async () => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(staticFile("TEST.mp4")),
  });
  try {
    const durationInSeconds = await input.computeDuration();
    return {
      durationInFrames: Math.max(Math.ceil(durationInSeconds * 30), 60),
    };
  } finally {
    input.dispose();
  }
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={EditorWorkspace}
      durationInFrames={60}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

export const EditorWorkspace: React.FC<Props> = () => {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const [clips, setClips] = useState<Clip[]>([
    {
      id: "clip-1",
      src: staticFile("TEST.mp4"),
      trackIndex: 0,
      start: 0,
      duration: durationInFrames,
      sourceStart: 0,
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>("clip-1");

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const handleSelect = (id: string) => {
    setSelectedClipId(id);
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    setClips(clips.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
  };

  const handleSplit = () => {
    if (!selectedClip) return;
    if (frame <= selectedClip.start || frame >= selectedClip.start + selectedClip.duration) {
      alert("Playhead must be within the selected clip to split.");
      return;
    }

    const offsetInClip = frame - selectedClip.start;
    const firstDuration = offsetInClip;
    const secondDuration = selectedClip.duration - offsetInClip;

    const firstClip: Clip = {
      ...selectedClip,
      duration: firstDuration,
    };

    const secondClip: Clip = {
      id: `clip-${Date.now()}`,
      src: selectedClip.src,
      trackIndex: selectedClip.trackIndex,
      start: frame,
      duration: secondDuration,
      sourceStart: selectedClip.sourceStart + firstDuration,
    };

    setClips(
      clips
        .flatMap((c) => (c.id === selectedClip.id ? [firstClip, secondClip] : [c]))
        .sort((a, b) => a.start - b.start)
    );
    setSelectedClipId(secondClip.id);
  };

  const handleMove = (deltaFrames: number) => {
    if (!selectedClip) return;
    const newStart = Math.max(0, selectedClip.start + deltaFrames);
    setClips(
      clips.map((c) => (c.id === selectedClip.id ? { ...c, start: newStart } : c))
    );
  };

  const handleTrimStart = (delta: number) => {
    if (!selectedClip) return;
    const newStart = Math.max(0, selectedClip.start + delta);
    const frameDiff = newStart - selectedClip.start;
    const newDuration = selectedClip.duration - frameDiff;
    const newSourceStart = selectedClip.sourceStart + frameDiff;

    if (newDuration <= 5 || newSourceStart < 0) return;

    setClips(
      clips.map((c) =>
        c.id === selectedClip.id
          ? { ...c, start: newStart, duration: newDuration, sourceStart: newSourceStart }
          : c
      )
    );
  };

  const handleTrimEnd = (delta: number) => {
    if (!selectedClip) return;
    const newDuration = selectedClip.duration + delta;
    if (newDuration <= 5) return;

    setClips(
      clips.map((c) =>
        c.id === selectedClip.id ? { ...c, duration: newDuration } : c
      )
    );
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#1e1e24", color: "#fff", fontFamily: "sans-serif" }}>
      {/* Top: Video Preview */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", backgroundColor: "#0f0f13", overflow: "hidden" }}>
        <div style={{ width: "640px", height: "360px", position: "relative", background: "#000", border: "1px solid #333" }}>
          {clips.map((clip) => (
            <Sequence
              key={clip.id}
              from={clip.start}
              durationInFrames={clip.duration}
              style={{
                translate: "-221px -666px"
              }}
            >
              <div style={{ width: "100%", height: "100%", position: "absolute" }}>
                <Video src={clip.src} startFrom={clip.sourceStart} />
              </div>
            </Sequence>
          ))}
        </div>
      </div>

      {/* Editing Toolbar */}
      <div style={{ height: "50px", backgroundColor: "#2d2d34", display: "flex", alignItems: "center", padding: "0 20px", gap: "10px", borderTop: "1px solid #3f3f46" }}>
        <span style={{ fontSize: "14px", fontWeight: "bold", marginRight: "10px" }}>CapCut Editor</span>
        <button
          onClick={handleSplit}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: selectedClip ? "#3b82f6" : "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          Split at Playhead
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: selectedClip ? "#ef4444" : "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          Delete
        </button>
        <button
          onClick={() => handleMove(-10)}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          ← Move -10f
        </button>
        <button
          onClick={() => handleMove(10)}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          Move +10f →
        </button>
        <button
          onClick={() => handleTrimStart(5)}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          Trim Start +5f
        </button>
        <button
          onClick={() => handleTrimEnd(-5)}
          disabled={!selectedClip}
          style={{ padding: "6px 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: "4px", cursor: selectedClip ? "pointer" : "not-allowed" }}
        >
          Trim End -5f
        </button>
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "#9ca3af" }}>
          Current Frame: {frame} / {durationInFrames} | Selected: {selectedClipId || "None"}
        </span>
      </div>

      {/* Bottom: Timeline UI */}
      <div style={{ height: "180px", backgroundColor: "#18181b", display: "flex", flexDirection: "column", borderTop: "1px solid #3f3f46" }}>
        {/* Time Ruler */}
        <div style={{ height: "30px", backgroundColor: "#27272a", position: "relative", borderBottom: "1px solid #3f3f46", display: "flex", alignItems: "center", paddingLeft: "10px" }}>
          <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Time Ruler (Playhead at frame {frame})</span>
          {/* Playhead indicator line */}
          <div style={{ position: "absolute", left: `${(frame / durationInFrames) * 100}%`, top: 0, bottom: 0, width: "2px", backgroundColor: "#ef4444", zIndex: 10 }} />
        </div>

        {/* Tracks Container */}
        <div style={{ flex: 1, position: "relative", overflowX: "auto", padding: "10px" }}>
          {/* Video Track */}
          <div style={{ height: "55px", backgroundColor: "#27272a", marginBottom: "10px", position: "relative", borderRadius: "6px", border: "1px solid #3f3f46" }}>
            <div style={{ position: "absolute", left: "2px", top: "2px", fontSize: "10px", color: "#a1a1aa" }}>Video Track</div>
            {clips.map((clip) => {
              const leftPercent = (clip.start / durationInFrames) * 100;
              const widthPercent = (clip.duration / durationInFrames) * 100;
              const isSelected = clip.id === selectedClipId;
              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(clip.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: "18px",
                    height: "32px",
                    backgroundColor: isSelected ? "#2563eb" : "#3f3f46",
                    border: isSelected ? "2px solid #60a5fa" : "1px solid #52525b",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 6px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    fontSize: "12px",
                  }}
                >
                  {clip.id} (start: {clip.start}, dur: {clip.duration})
                </div>
              );
            })}
          </div>

          {/* Audio Track */}
          <div style={{ height: "45px", backgroundColor: "#27272a", position: "relative", borderRadius: "6px", border: "1px solid #3f3f46" }}>
            <div style={{ position: "absolute", left: "2px", top: "2px", fontSize: "10px", color: "#a1a1aa" }}>Audio Track (TEST.mp4 Audio)</div>
            {clips.map((clip) => {
              const leftPercent = (clip.start / durationInFrames) * 100;
              const widthPercent = (clip.duration / durationInFrames) * 100;
              return (
                <div
                  key={`audio-${clip.id}`}
                  style={{
                    position: "absolute",
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: "16px",
                    height: "24px",
                    backgroundColor: "#065f46",
                    border: "1px solid #047857",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 6px",
                    fontSize: "11px",
                    color: "#a7f3d0",
                  }}
                >
                  Audio {clip.id}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

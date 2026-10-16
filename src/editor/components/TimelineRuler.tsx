import React, { useEffect, useMemo, useRef, useState } from "react";

type TimelineRulerProps = {
  totalDurationInFrames: number;
  zoom: number;
  fps: number;
  onSeek: (frame: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

function formatRulerTime(frame: number, fps: number, isFrameLevel: boolean): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const framePart = frame % fps;

  if (isFrameLevel) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(framePart).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDurationInFrames,
  zoom,
  fps,
  onSeek,
  scrollContainerRef,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, clientWidth: 1600 });

  const totalWidthPx = Math.max(1400, totalDurationInFrames * zoom + 500);

  // Synchronize with parent scroll container for viewport-based tick windowing
  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollState({
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
      });
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  // Determine tick & label intervals based on zoom (pixels per frame)
  const isFrameLevel = zoom >= 3.5;

  let majorIntervalFrames = fps; // Default 1 second
  let minorIntervalFrames = Math.max(1, Math.round(fps / 2));
  let singleFrameTicks = false;

  if (zoom >= 18) {
    // Extreme frame level: 18px to 40px per frame
    singleFrameTicks = true;
    minorIntervalFrames = 5; // Medium mark every 5 frames
    majorIntervalFrames = 10; // Labeled tick every 10 frames (MM:SS:FF)
  } else if (zoom >= 7) {
    // High frame level: 7px to 18px per frame
    singleFrameTicks = true;
    minorIntervalFrames = 5;
    majorIntervalFrames = 15; // Labeled tick every 15 frames (0.5s)
  } else if (zoom >= 3.5) {
    // Frame level entry: 3.5px to 7px per frame
    singleFrameTicks = true;
    minorIntervalFrames = 5;
    majorIntervalFrames = fps; // Labeled tick every 30 frames (1s)
  } else if (zoom >= 1.5) {
    // Near frame level
    singleFrameTicks = false;
    minorIntervalFrames = 15;
    majorIntervalFrames = fps; // Labeled tick every 1s
  } else if (zoom >= 0.7) {
    singleFrameTicks = false;
    minorIntervalFrames = fps;
    majorIntervalFrames = fps * 2; // 2 seconds
  } else if (zoom >= 0.3) {
    singleFrameTicks = false;
    minorIntervalFrames = fps * 2;
    majorIntervalFrames = fps * 5; // 5 seconds
  } else {
    // Zoomed far out
    singleFrameTicks = false;
    minorIntervalFrames = fps * 5;
    majorIntervalFrames = fps * 15; // 15 seconds
  }

  // Calculate visible frame bounds with buffer
  const visibleStartFrame = Math.max(
    0,
    Math.floor((scrollState.scrollLeft - 200) / zoom)
  );
  const visibleEndFrame = Math.min(
    totalDurationInFrames + fps * 5,
    Math.ceil((scrollState.scrollLeft + scrollState.clientWidth + 200) / zoom)
  );

  const renderedTicks = useMemo(() => {
    const ticks: React.ReactNode[] = [];

    // 1. Single-frame ticks when zoomed in to frame level
    if (singleFrameTicks) {
      const firstFrame = Math.floor(visibleStartFrame);
      const lastFrame = Math.ceil(visibleEndFrame);

      for (let f = firstFrame; f <= lastFrame; f++) {
        if (f % minorIntervalFrames !== 0 && f % majorIntervalFrames !== 0) {
          const left = f * zoom;
          ticks.push(
            <div
              key={`f-${f}`}
              className="ruler-frame-tick"
              style={{ left: `${left}px` }}
              title={`Frame ${f} (${(f / fps).toFixed(2)}s)`}
            />
          );
        }
      }
    }

    // 2. Minor sub-ticks
    const firstMinor = Math.floor(visibleStartFrame / minorIntervalFrames) * minorIntervalFrames;
    for (let f = firstMinor; f <= visibleEndFrame; f += minorIntervalFrames) {
      if (f % majorIntervalFrames !== 0) {
        const left = f * zoom;
        ticks.push(
          <div
            key={`minor-${f}`}
            className="ruler-subtick"
            style={{ left: `${left}px` }}
          />
        );
      }
    }

    // 3. Major labeled ticks
    const firstMajor = Math.floor(visibleStartFrame / majorIntervalFrames) * majorIntervalFrames;
    for (let f = firstMajor; f <= visibleEndFrame; f += majorIntervalFrames) {
      const left = f * zoom;
      const label = formatRulerTime(f, fps, isFrameLevel);

      ticks.push(
        <div key={`major-${f}`} className="ruler-tick" style={{ left: `${left}px` }}>
          {label}
        </div>
      );
    }

    return ticks;
  }, [
    singleFrameTicks,
    visibleStartFrame,
    visibleEndFrame,
    minorIntervalFrames,
    majorIntervalFrames,
    zoom,
    fps,
    isFrameLevel,
  ]);

  // Pointer scrub handler
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();

    const seekAtPosition = (clientX: number) => {
      const offsetX = clientX - rect.left;
      const targetFrame = Math.max(0, Math.min(totalDurationInFrames, Math.round(offsetX / zoom)));
      onSeek(targetFrame);
    };

    seekAtPosition(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      seekAtPosition(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={rulerRef}
      className={`time-ruler ${isFrameLevel ? "frame-level" : ""}`}
      style={{ width: `${totalWidthPx}px` }}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      {renderedTicks}
    </div>
  );
};

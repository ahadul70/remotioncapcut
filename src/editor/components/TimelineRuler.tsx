import React, { useRef } from "react";

type TimelineRulerProps = {
  totalDurationInFrames: number;
  zoom: number;
  fps: number;
  onSeek: (frame: number) => void;
};

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDurationInFrames,
  zoom,
  fps,
  onSeek,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  const totalWidthPx = Math.max(1400, totalDurationInFrames * zoom + 500);

  // Dynamic interval calculation
  const pxPerSecond = fps * zoom;
  let secondInterval = 1;
  if (pxPerSecond < 20) secondInterval = 10;
  else if (pxPerSecond < 45) secondInterval = 5;
  else if (pxPerSecond < 90) secondInterval = 2;
  else secondInterval = 1;

  const totalSeconds = Math.ceil(totalDurationInFrames / fps) + 15;
  const tickCount = Math.ceil(totalSeconds / secondInterval);

  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const sec = i * secondInterval;
    const frame = sec * fps;
    const left = frame * zoom;
    const minutes = Math.floor(sec / 60);
    const remainderSec = sec % 60;
    const label = `${String(minutes).padStart(2, "0")}:${String(remainderSec).padStart(2, "0")}`;

    ticks.push(
      <div key={`tick-${sec}`} className="ruler-tick" style={{ left: `${left}px` }}>
        {label}
      </div>
    );

    // Minor subtick between seconds if spacing permits
    if (secondInterval === 1 && pxPerSecond > 60) {
      ticks.push(
        <div
          key={`subtick-${sec}`}
          className="ruler-subtick"
          style={{ left: `${left + pxPerSecond / 2}px` }}
        />
      );
    }
  }

  // Pointer scrub handler
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();

    const seekAtPosition = (clientX: number) => {
      const offsetX = clientX - rect.left;
      const targetFrame = Math.max(0, Math.round(offsetX / zoom));
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
      className="time-ruler"
      style={{ width: `${totalWidthPx}px` }}
      onPointerDown={handlePointerDown}
    >
      {ticks}
    </div>
  );
};

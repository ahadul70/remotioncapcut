import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clip } from "../state/editorTypes";
import { sliceWaveform, waveformCache } from "../utils/waveformCache";

interface ClipWaveformProps {
  clip: Clip;
  widthPx: number;
}

export const ClipWaveform: React.FC<ClipWaveformProps> = ({ clip, widthPx }) => {
  const [allPeaks, setAllPeaks] = useState<number[] | null>(() => {
    return waveformCache.getCached(clip.src) || null;
  });

  const activeClipIdRef = useRef(clip.id);
  activeClipIdRef.current = clip.id;

  // Asynchronously decode and fetch peaks for this media source
  useEffect(() => {
    let isMounted = true;
    const currentClipId = clip.id;
    const src = clip.src;

    if (!src) return;

    const cached = waveformCache.getCached(src);
    if (cached) {
      setAllPeaks(cached);
      return;
    }

    waveformCache
      .getWaveform(src)
      .then((peaks) => {
        if (!isMounted || activeClipIdRef.current !== currentClipId) return;
        if (peaks) {
          setAllPeaks(peaks);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [clip.id, clip.src]);

  // Compute sliced peaks for current trim range
  const visiblePeaks = useMemo(() => {
    if (!allPeaks || allPeaks.length === 0) return null;
    return sliceWaveform(
      allPeaks,
      clip.sourceStartFrame,
      clip.durationInFrames,
      clip.sourceDurationInFrames
    );
  }, [allPeaks, clip.sourceStartFrame, clip.durationInFrames, clip.sourceDurationInFrames]);

  // Generate SVG path for crisp mirrored waveform rendering
  const svgPath = useMemo(() => {
    if (!visiblePeaks || visiblePeaks.length === 0 || widthPx <= 0) return "";

    const count = visiblePeaks.length;
    const centerY = 20; // 40px clip height center
    const maxAmplitude = 16; // Max half-height for peaks

    let topPath = "";
    let bottomPath = "";

    const step = widthPx / count;

    for (let i = 0; i < count; i++) {
      const x = +(i * step).toFixed(1);
      const amp = +(visiblePeaks[i] * maxAmplitude).toFixed(1);
      const topY = Math.max(2, centerY - amp);
      const bottomY = Math.min(38, centerY + amp);

      if (i === 0) {
        topPath += `M ${x} ${centerY} L ${x} ${topY}`;
        bottomPath = `L ${x} ${bottomY} Z`;
      } else {
        topPath += ` L ${x} ${topY}`;
        bottomPath = ` L ${x} ${bottomY}` + bottomPath;
      }
    }

    return topPath + bottomPath;
  }, [visiblePeaks, widthPx]);

  if (!visiblePeaks || !svgPath) {
    // Subtle fallback baseline when decoding or no audio
    return (
      <div className="clip-waveform-track placeholder" aria-hidden="true">
        <div className="waveform-centerline" />
      </div>
    );
  }

  return (
    <div className="clip-waveform-track" aria-hidden="true">
      <svg
        className="waveform-svg"
        viewBox={`0 0 ${widthPx} 40`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <path d={svgPath} fill="rgba(52, 211, 153, 0.45)" stroke="rgba(52, 211, 153, 0.85)" strokeWidth="0.75" />
      </svg>
    </div>
  );
};

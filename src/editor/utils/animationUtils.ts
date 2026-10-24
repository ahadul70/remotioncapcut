import { interpolate, spring, Easing } from "remotion";
import { DropSettleParams, PaperSlideParams, TextHighlightParams } from "../state/editorTypes";

/**
 * Deterministic Drop & Settle Animation (Vox Paper Physics).
 * Simulates mechanical paper drop with realistic inertia and subtle overshoot.
 */
export function computeDropAndSettle(
  frame: number,
  fps: number,
  params?: DropSettleParams
): { translateY: number; scale: number; opacity: number } {
  const delay = Math.max(0, params?.delayFrames ?? 0);
  const startOffset = params?.startOffsetY ?? 160;
  const settleStrength = (params?.settleStrength ?? 50) / 100; // 0 to 1

  if (frame < delay) {
    return { translateY: -startOffset, scale: 1.08, opacity: 0 };
  }

  const activeFrame = frame - delay;

  // Remotion spring with overshoot tailored to settle strength
  const springProgress = spring({
    frame: activeFrame,
    fps,
    config: {
      damping: 12 + (1 - settleStrength) * 10,
      mass: 0.8,
      stiffness: 110,
    },
  });

  const translateY = interpolate(springProgress, [0, 1], [-startOffset, 0]);
  const scale = interpolate(springProgress, [0, 1], [1.08, 1]);
  const opacity = interpolate(springProgress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  return { translateY, scale, opacity };
}

/**
 * Deterministic Paper Slide Animation.
 */
export function computePaperSlide(
  frame: number,
  params?: PaperSlideParams
): { translateX: number; translateY: number; opacity: number } {
  const dir = params?.direction ?? "bottom";
  const duration = Math.max(5, params?.durationFrames ?? 16);
  const distance = 300;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  let translateX = 0;
  let translateY = 0;

  if (dir === "left") {
    translateX = (1 - progress) * -distance;
  } else if (dir === "right") {
    translateX = (1 - progress) * distance;
  } else if (dir === "top") {
    translateY = (1 - progress) * -distance;
  } else {
    // bottom
    translateY = (1 - progress) * distance;
  }

  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const cleanX = Object.is(translateX, -0) ? 0 : translateX;
  const cleanY = Object.is(translateY, -0) ? 0 : translateY;

  return { translateX: cleanX, translateY: cleanY, opacity };
}

/**
 * Deterministic Text Highlight Sweep.
 * Returns 0 to 1 progress for fluorescent highlighter reveal under words.
 */
export function computeTextHighlightProgress(
  frame: number,
  params?: TextHighlightParams
): number {
  const delay = Math.max(0, params?.delayFrames ?? 0);
  const duration = Math.max(4, params?.durationFrames ?? 14);

  if (frame < delay) return 0;

  return interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
}

/**
 * Deterministic Staggered Words Reveal.
 */
export function computeStaggerWordState(
  wordIndex: number,
  frame: number,
  staggerDelay = 3,
  wordDuration = 8
): { opacity: number; translateY: number } {
  const startFrame = wordIndex * staggerDelay;
  if (frame < startFrame) {
    return { opacity: 0, translateY: 14 };
  }

  const progress = interpolate(frame - startFrame, [0, wordDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(progress, [0, 1], [14, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return { opacity, translateY };
}

/**
 * Animated Progress for Data Bar fills.
 */
export function computeBarProgress(
  frame: number,
  fps: number,
  delayFrames = 0,
  durationFrames = 25
): number {
  if (frame < delayFrames) return 0;
  return spring({
    frame: frame - delayFrames,
    fps,
    durationInFrames: durationFrames,
    config: {
      damping: 16,
      mass: 0.9,
      stiffness: 90,
    },
  });
}

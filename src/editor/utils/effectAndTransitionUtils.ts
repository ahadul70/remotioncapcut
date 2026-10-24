import { EffectType, ClipEffect, TransitionType, Clip, ClipTransition } from "../state/editorTypes";

export const DEFAULT_EFFECT_VALUES: Record<EffectType, number> = {
  brightness: 100, // 100%
  contrast: 100,   // 100%
  saturation: 100, // 100%
  grayscale: 0,    // 0%
  blur: 0,         // 0px
  vignette: 0,     // 0%
};

export const EFFECT_METADATA: Record<
  EffectType,
  { label: string; min: number; max: number; unit: string; step: number; defaultVal: number }
> = {
  brightness: { label: "Brightness", min: 0, max: 200, unit: "%", step: 1, defaultVal: 100 },
  contrast: { label: "Contrast", min: 0, max: 200, unit: "%", step: 1, defaultVal: 100 },
  saturation: { label: "Saturation", min: 0, max: 200, unit: "%", step: 1, defaultVal: 100 },
  grayscale: { label: "Grayscale", min: 0, max: 100, unit: "%", step: 1, defaultVal: 0 },
  blur: { label: "Blur", min: 0, max: 20, unit: "px", step: 0.5, defaultVal: 0 },
  vignette: { label: "Vignette", min: 0, max: 100, unit: "%", step: 1, defaultVal: 0 },
};

export function clampEffectValue(type: EffectType, val: number): number {
  const meta = EFFECT_METADATA[type];
  if (!meta) return val;
  const clamped = Math.max(meta.min, Math.min(meta.max, Number.isFinite(val) ? val : meta.defaultVal));
  return Math.round(clamped * 10) / 10;
}

/**
 * Deterministically constructs CSS filter string from active clip effects.
 * Evaluates in both browser preview and Remotion headless renderer.
 */
export function buildCssFilter(effects?: ClipEffect[]): string {
  if (!effects || effects.length === 0) return "none";

  const parts: string[] = [];
  for (const eff of effects) {
    if (!eff.enabled) continue;
    const val = clampEffectValue(eff.type, eff.value);
    switch (eff.type) {
      case "brightness":
        if (val !== 100) parts.push(`brightness(${val}%)`);
        break;
      case "contrast":
        if (val !== 100) parts.push(`contrast(${val}%)`);
        break;
      case "saturation":
        if (val !== 100) parts.push(`saturate(${val}%)`);
        break;
      case "grayscale":
        if (val > 0) parts.push(`grayscale(${val}%)`);
        break;
      case "blur":
        if (val > 0) parts.push(`blur(${val}px)`);
        break;
      case "vignette":
        // Vignette is rendered as an overlay layer, not CSS filter
        break;
    }
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

/**
 * Gets vignette intensity (0 to 100) if enabled
 */
export function getVignetteIntensity(effects?: ClipEffect[]): number {
  if (!effects) return 0;
  const v = effects.find((e) => e.type === "vignette" && e.enabled);
  return v ? clampEffectValue("vignette", v.value) : 0;
}

export const MIN_TRANSITION_FRAMES = 3;
export const DEFAULT_TRANSITION_FRAMES = 15; // 0.5s at 30fps

export const TRANSITION_TYPES: { type: TransitionType; label: string; description: string }[] = [
  { type: "crossfade", label: "Cross Dissolve", description: "Smoothly dissolves between clips or fades opacity" },
  { type: "fade-to-black", label: "Fade to Black", description: "Fades clip out to pure black" },
  { type: "fade-from-black", label: "Fade from Black", description: "Fades clip in from pure black" },
];

export function getMaxTransitionDuration(clipDuration: number): number {
  return Math.max(1, Math.floor(clipDuration / 2));
}

export function clampTransitionDuration(duration: number, clipDuration: number): number {
  const max = getMaxTransitionDuration(clipDuration);
  const min = Math.min(MIN_TRANSITION_FRAMES, max);
  return Math.max(min, Math.min(Math.round(duration), max));
}

export function validateAndClampTransitions(
  transitions: ClipTransition[],
  clips: Clip[]
): ClipTransition[] {
  const clipMap = new Map<string, Clip>();
  clips.forEach((c) => clipMap.set(c.id, c));

  return transitions
    .filter((t) => {
      const hasFrom = t.fromClipId ? clipMap.has(t.fromClipId) : false;
      const hasTo = t.toClipId ? clipMap.has(t.toClipId) : false;
      return hasFrom || hasTo;
    })
    .map((t) => {
      let maxDuration = 300;
      if (t.fromClipId && clipMap.has(t.fromClipId)) {
        const fromClip = clipMap.get(t.fromClipId)!;
        maxDuration = Math.min(maxDuration, getMaxTransitionDuration(fromClip.durationInFrames));
      }
      if (t.toClipId && clipMap.has(t.toClipId)) {
        const toClip = clipMap.get(t.toClipId)!;
        maxDuration = Math.min(maxDuration, getMaxTransitionDuration(toClip.durationInFrames));
      }
      const clamped = Math.max(1, Math.min(Math.round(t.durationInFrames), maxDuration));
      return clamped === t.durationInFrames ? t : { ...t, durationInFrames: clamped };
    });
}

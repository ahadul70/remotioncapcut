import { random } from "remotion";
import {
  Clip,
  ClipEffect,
  EditorialGraphicData,
  EffectType,
  GraphicType,
  TransitionType,
} from "../state/editorTypes";

export type EffectCategory = "paper" | "typography" | "filter";

export type EffectDefinition = {
  type: EffectType;
  label: string;
  category: EffectCategory;
  description: string;
  defaultParams?: Record<string, unknown>;
  defaultSliderValue: number;
};

export const EDITORIAL_EFFECTS_REGISTRY: EffectDefinition[] = [
  // Physical paper-cutout family
  {
    type: "paper-cutout",
    label: "Paper Cutout",
    category: "paper",
    description: "Physical matte paper border, realistic drop shadow, and subtle tilt",
    defaultSliderValue: 70,
    defaultParams: {
      borderWidth: 8,
      shadowElevation: 60,
      tiltAngle: -2.5,
      tapeStyle: "corners",
      tapeColor: "rgba(254, 240, 138, 0.65)", // Warm masking tape
      paperColor: "#fbfbfa",
    },
  },
  {
    type: "drop-settle",
    label: "Drop & Settle",
    category: "paper",
    description: "Physical mechanical drop with inertia and realistic settle bounce",
    defaultSliderValue: 60,
    defaultParams: {
      delayFrames: 0,
      durationFrames: 24,
      settleStrength: 65,
      startOffsetY: 180,
    },
  },
  {
    type: "paper-slide",
    label: "Paper Slide Reveal",
    category: "paper",
    description: "Directional matte paper strip slide reveal",
    defaultSliderValue: 50,
    defaultParams: {
      direction: "bottom",
      durationFrames: 18,
      shadowIntensity: 45,
    },
  },

  // Editorial typography family
  {
    type: "text-highlight",
    label: "Marker Highlight",
    category: "typography",
    description: "Pastel marker sweep reveal behind emphasis words",
    defaultSliderValue: 80,
    defaultParams: {
      highlightColor: "#fef08a", // Highlighter yellow
      delayFrames: 6,
      durationFrames: 14,
      mode: "sweep",
    },
  },
  {
    type: "stagger-words",
    label: "Staggered Reveal",
    category: "typography",
    description: "Sequential line/word sliding reveal in natural speech cadence",
    defaultSliderValue: 3,
    defaultParams: {
      staggerDelay: 3,
      direction: "up",
    },
  },

  // Color & Filter family
  {
    type: "brightness",
    label: "Brightness",
    category: "filter",
    description: "Adjust clip exposure and brightness level",
    defaultSliderValue: 100,
  },
  {
    type: "contrast",
    label: "Contrast",
    category: "filter",
    description: "Deepen shadows and highlight contrast",
    defaultSliderValue: 100,
  },
  {
    type: "saturation",
    label: "Saturation",
    category: "filter",
    description: "Adjust color vibrancy or produce muted documentary tones",
    defaultSliderValue: 100,
  },
  {
    type: "grayscale",
    label: "Documentary B&W",
    category: "filter",
    description: "Converts imagery to black and white archive look",
    defaultSliderValue: 0,
  },
  {
    type: "blur",
    label: "Gaussian Blur",
    category: "filter",
    description: "Soft focus background blur",
    defaultSliderValue: 0,
  },
  {
    type: "vignette",
    label: "Vignette",
    category: "filter",
    description: "Darkened edge gradient focusing center attention",
    defaultSliderValue: 0,
  },
];

export const EDITORIAL_TRANSITION_TYPES: { type: TransitionType; label: string; description: string }[] = [
  { type: "crossfade", label: "Cross Dissolve", description: "Smooth linear cross-dissolve" },
  { type: "fade-to-black", label: "Fade to Black", description: "Clean fade out into pure black" },
  { type: "fade-from-black", label: "Fade from Black", description: "Intro reveal from pure black" },
  { type: "directional-wipe", label: "Matte Wipe", description: "Editorial directional cut wipe" },
  { type: "paper-slide", label: "Paper Slide Cut", description: "Physical paper sheet sliding over cut" },
  { type: "paper-stack", label: "Card Replacement", description: "Foreground card drops settling over previous scene" },
];

// Presets for creating real Editorial Data Graphics clips
export const DEFAULT_GRAPHIC_PRESETS: {
  type: GraphicType;
  title: string;
  description: string;
  data: EditorialGraphicData;
}[] = [
  {
    type: "comparison-bars",
    title: "Comparison Bars",
    description: "Two-entity metric comparison with animated fill and delta",
    data: {
      graphicType: "comparison-bars",
      comparisonBars: {
        labelA: "Platform A (Traditional)",
        valueA: 68,
        labelB: "Platform B (Modern)",
        valueB: 24,
        unit: "%",
        colorA: "#3b82f6",
        colorB: "#f43f5e",
        animatedDurationFrames: 24,
      },
    },
  },
  {
    type: "stat-card",
    title: "Statistic Card",
    description: "Prominent numerical data callout with metric label and growth indicator",
    data: {
      graphicType: "stat-card",
      statCard: {
        value: "$4.8B",
        label: "ANNUAL REVENUE GENERATED",
        delta: "+34.2% YoY",
        deltaPositive: true,
        caption: "Source: SEC Q4 10-K Filings",
      },
    },
  },
  {
    type: "evidence-card",
    title: "Evidence Document Callout",
    description: "Archival paper document quote with highlighted excerpt and citation",
    data: {
      graphicType: "evidence-card",
      evidenceCard: {
        headline: "INTERNAL MEMORANDUM // EXHIBIT B",
        quote: "The pricing algorithm systematically prioritized internal platform margins over neutrality.",
        source: "Executive Committee Briefing, Page 14",
        highlightedPhrase: "prioritized internal platform margins",
      },
    },
  },
  {
    type: "percentage-card",
    title: "Percentage Change Card",
    description: "Animated baseline-to-target shift indicator",
    data: {
      graphicType: "percentage-card",
      percentageCard: {
        metric: "Global Market Penetration",
        fromValue: 12,
        toValue: 47,
        unit: "%",
      },
    },
  },
];

/**
 * Creates a new Clip containing an Editorial Graphic.
 */
export function createGraphicClip(
  graphicType: GraphicType,
  targetTrackId: string,
  timelineStartFrame: number,
  durationInFrames = 120
): Clip {
  const preset = DEFAULT_GRAPHIC_PRESETS.find((p) => p.type === graphicType);
  const graphicData: EditorialGraphicData = preset
    ? JSON.parse(JSON.stringify(preset.data))
    : {
        graphicType,
        statCard: {
          value: "100%",
          label: "EDITORIAL GRAPHIC",
          caption: "Source: Investigation",
        },
      };

  return {
    id: `clip-graphic-${Date.now().toString(36)}-${random(null).toString(36).substring(2, 6)}`,
    assetId: `asset-graphic-${graphicType}`,
    name: preset ? preset.title : `Graphic (${graphicType})`,
    type: "graphic",
    trackId: targetTrackId,
    timelineStartFrame,
    sourceStartFrame: 0,
    durationInFrames,
    sourceDurationInFrames: durationInFrames,
    src: "",
    positionX: 0,
    positionY: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    graphicData,
  };
}

/**
 * Creates a new ClipEffect with default parameters.
 */
export function createEffectInstance(type: EffectType): ClipEffect {
  const def = EDITORIAL_EFFECTS_REGISTRY.find((d) => d.type === type);
  return {
    id: `eff-${type}-${Date.now().toString(36)}-${random(null).toString(36).substring(2, 6)}`,
    type,
    enabled: true,
    value: def ? def.defaultSliderValue : 100,
    params: def?.defaultParams ? JSON.parse(JSON.stringify(def.defaultParams)) : undefined,
  };
}

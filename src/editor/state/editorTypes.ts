export type ClipType = "video" | "audio" | "image" | "text" | "graphic";

export type EffectType =
  // Color & Filter
  | "brightness"
  | "contrast"
  | "saturation"
  | "grayscale"
  | "blur"
  | "vignette"
  // Physical Paper-Cutout (Vox Style)
  | "paper-cutout"
  | "drop-settle"
  | "paper-slide"
  // Editorial Typography (Vox Style)
  | "text-highlight"
  | "stagger-words";

export type PaperCutoutParams = {
  borderWidth?: number;       // e.g. 6px white/cream border
  shadowElevation?: number;   // 0 to 100
  tiltAngle?: number;         // -15 to +15 deg
  tapeStyle?: "none" | "top-center" | "corners";
  tapeColor?: string;
  paperColor?: string;        // e.g. #fbfbfa (matte warm paper)
};

export type DropSettleParams = {
  delayFrames?: number;       // frame delay
  durationFrames?: number;    // spring duration
  settleStrength?: number;    // overshoot dampening (0 to 100)
  startOffsetY?: number;      // initial drop height (px)
};

export type PaperSlideParams = {
  direction?: "left" | "right" | "top" | "bottom";
  durationFrames?: number;
  shadowIntensity?: number;
};

export type TextHighlightParams = {
  highlightColor?: string;    // e.g. #fef08a (matte yellow), #a7f3d0 (mint), #fed7aa (peach)
  delayFrames?: number;
  durationFrames?: number;
  mode?: "sweep" | "box" | "underline";
};

export type StaggerWordsParams = {
  staggerDelay?: number;      // frames per word
  direction?: "up" | "fade";
};

export type EffectParams =
  | PaperCutoutParams
  | DropSettleParams
  | PaperSlideParams
  | TextHighlightParams
  | StaggerWordsParams
  | Record<string, unknown>;

export type ClipEffect = {
  id: string;
  type: EffectType;
  enabled: boolean;
  value: number; // Primary slider/numeric value
  params?: EffectParams;
};

export type TransitionType =
  | "crossfade"
  | "fade-to-black"
  | "fade-from-black"
  | "directional-wipe"
  | "paper-slide"
  | "paper-stack";

export type TransitionParams = {
  direction?: "left" | "right" | "top" | "bottom";
  paperColor?: string;
};

export type ClipTransition = {
  id: string;
  type: TransitionType;
  durationInFrames: number; // Positive integer frames
  trackId: string;
  fromClipId?: string; // Preceding/outgoing clip ID
  toClipId?: string;   // Following/incoming clip ID
  params?: TransitionParams;
};

// Data & Explanatory Graphics Models (Vox Style)
export type GraphicType =
  | "comparison-bars"
  | "stat-card"
  | "evidence-card"
  | "percentage-card";

export type ComparisonBarsData = {
  labelA: string;
  valueA: number; // e.g. 74
  labelB: string;
  valueB: number; // e.g. 38
  unit?: string;  // e.g. "%" or "$B"
  colorA?: string;
  colorB?: string;
  animatedDurationFrames?: number;
};

export type StatCardData = {
  value: string;       // e.g. "$4.8B" or "83%"
  label: string;       // e.g. "ANNUAL ADVERTISING REVENUE"
  delta?: string;      // e.g. "+38.4%"
  deltaPositive?: boolean;
  caption?: string;    // e.g. "Source: SEC Q4 10-K Filings"
};

export type EvidenceCardData = {
  headline?: string;   // e.g. "KEY EVIDENCE #1"
  quote: string;       // e.g. "The pricing algorithm prioritized internal margin over competitive neutrality."
  source: string;      // e.g. "Internal Memo, Executive Briefing (2023)"
  highlightedPhrase?: string; // e.g. "prioritized internal margin"
};

export type PercentageCardData = {
  metric: string;      // e.g. "Operating Margin"
  fromValue: number;   // e.g. 12
  toValue: number;     // e.g. 28
  unit?: string;       // e.g. "%"
};

export type EditorialGraphicData = {
  graphicType: GraphicType;
  comparisonBars?: ComparisonBarsData;
  statCard?: StatCardData;
  evidenceCard?: EvidenceCardData;
  percentageCard?: PercentageCardData;
};

export type Clip = {
  id: string;
  assetId: string;
  name: string;
  type: ClipType;
  trackId: string;

  // All timeline positions and durations in integer frames
  timelineStartFrame: number;
  sourceStartFrame: number;
  durationInFrames: number;
  sourceDurationInFrames: number;
  src: string;

  // Visual and transform properties
  positionX?: number; // px offset
  positionY?: number; // px offset
  scale?: number;     // 1.0 = 100%
  rotation?: number;  // degrees
  opacity?: number;   // 0.0 to 1.0

  // Audio properties
  volume?: number;    // 0.0 to 1.0
  muted?: boolean;

  // Visual & Editorial effects
  effects?: ClipEffect[];

  // Text clip properties (Step 6)
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";

  // Data & Explanatory Graphics (Vox Style Milestone)
  graphicData?: EditorialGraphicData;

  // Future playback rate
  playbackRate?: number;
};

export type TrackType = "video" | "audio";

export type Track = {
  id: string;
  type: TrackType;
  name: string;
  muted?: boolean;
  locked?: boolean;
  visible?: boolean;
};

export type MediaAsset = {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  src: string;
  durationInFrames: number;
  durationInSeconds: number;
  width?: number;
  height?: number;
  fps: number;
  thumbnail?: string;
};

export type EditorTool = "select" | "split" | "trim" | "delete";

export type SidebarTab =
  | "media"
  | "audio"
  | "text"
  | "captions"
  | "transitions"
  | "effects"
  | "graphics"
  | "ai";

export type EditorState = {
  projectName: string;
  fps: number;
  width: number;
  height: number;
  totalDurationInFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  selectedTransitionId?: string | null;
  activeTool: EditorTool;
  snappingEnabled: boolean;
  zoom: number; // pixels per frame (e.g. 2 to 20)
  tracks: Track[];
  clips: Clip[];
  transitions?: ClipTransition[];
  assets: MediaAsset[];
  activeSidebarTab: SidebarTab;
  isExportDialogOpen: boolean;
  saveStatus: "saved" | "unsaved" | "saving";
};

export type HistorySnapshot = {
  clips: Clip[];
  tracks: Track[];
  transitions?: ClipTransition[];
  selectedClipId: string | null;
  selectedTransitionId?: string | null;
  totalDurationInFrames: number;
};

export type ClipType = "video" | "audio" | "image" | "text";

export type EffectType =
  | "brightness"
  | "contrast"
  | "saturation"
  | "grayscale"
  | "blur"
  | "vignette";

export type ClipEffect = {
  id: string;
  type: EffectType;
  enabled: boolean;
  value: number; // e.g. 0-200% for brightness/contrast/saturation, 0-100% for grayscale/vignette, 0-20px for blur
};

export type TransitionType = "crossfade" | "fade-to-black" | "fade-from-black";

export type ClipTransition = {
  id: string;
  type: TransitionType;
  durationInFrames: number; // Positive integer frames
  trackId: string;
  fromClipId?: string; // Preceding/outgoing clip ID
  toClipId?: string;   // Following/incoming clip ID
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

  // Visual effects
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

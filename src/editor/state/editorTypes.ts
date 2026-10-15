export type ClipType = "video" | "audio" | "image" | "text";

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
  activeTool: EditorTool;
  snappingEnabled: boolean;
  zoom: number; // pixels per frame (e.g. 2 to 20)
  tracks: Track[];
  clips: Clip[];
  assets: MediaAsset[];
  activeSidebarTab: SidebarTab;
  isExportDialogOpen: boolean;
  saveStatus: "saved" | "unsaved" | "saving";
};

export type HistorySnapshot = {
  clips: Clip[];
  tracks: Track[];
  selectedClipId: string | null;
  totalDurationInFrames: number;
};

import { random } from "remotion";
import {
  Clip,
  EditorState,
  HistorySnapshot,
  MediaAsset,
} from "./editorTypes";

export type Action =
  | { type: "SET_PLAYHEAD"; frame: number }
  | { type: "SET_IS_PLAYING"; isPlaying: boolean }
  | { type: "SELECT_CLIP"; id: string | null }
  | { type: "SET_ACTIVE_TOOL"; tool: EditorState["activeTool"] }
  | { type: "SET_SIDEBAR_TAB"; tab: EditorState["activeSidebarTab"] }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "TOGGLE_SNAPPING" }
  | { type: "MOVE_CLIP"; clipId: string; newStartFrame: number }
  | { type: "TRIM_CLIP_START"; clipId: string; newStartFrame: number }
  | { type: "TRIM_CLIP_END"; clipId: string; newDurationInFrames: number }
  | { type: "SPLIT_CLIP_AT_PLAYHEAD" }
  | { type: "DELETE_CLIP"; clipId?: string }
  | { type: "UPDATE_CLIP_PROPERTIES"; clipId: string; properties: Partial<Clip> }
  | { type: "TOGGLE_TRACK_MUTE"; trackId: string }
  | { type: "TOGGLE_TRACK_LOCK"; trackId: string }
  | { type: "TOGGLE_TRACK_VISIBLE"; trackId: string }
  | { type: "SET_EXPORT_DIALOG_OPEN"; isOpen: boolean }
  | { type: "RESTORE_SNAPSHOT"; snapshot: HistorySnapshot }
  | { type: "SET_TOTAL_DURATION"; duration: number }
  | { type: "RENAME_PROJECT"; name: string }
  | { type: "ADD_ASSET"; asset: MediaAsset };

function recalculateDuration(clips: Clip[], defaultDuration: number): number {
  if (clips.length === 0) return defaultDuration;
  const maxEnd = Math.max(...clips.map((c) => c.timelineStartFrame + c.durationInFrames));
  return Math.max(defaultDuration, maxEnd + 30); // 1 sec padding at end
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "SET_PLAYHEAD": {
      const frame = Math.max(0, Math.min(action.frame, state.totalDurationInFrames));
      return { ...state, currentFrame: frame };
    }

    case "SET_IS_PLAYING": {
      return { ...state, isPlaying: action.isPlaying };
    }

    case "SELECT_CLIP": {
      return { ...state, selectedClipId: action.id };
    }

    case "SET_ACTIVE_TOOL": {
      return { ...state, activeTool: action.tool };
    }

    case "SET_SIDEBAR_TAB": {
      return { ...state, activeSidebarTab: action.tab };
    }

    case "SET_ZOOM": {
      const zoom = Math.max(1, Math.min(action.zoom, 25));
      return { ...state, zoom };
    }

    case "TOGGLE_SNAPPING": {
      return { ...state, snappingEnabled: !state.snappingEnabled };
    }

    case "MOVE_CLIP": {
      const clip = state.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;

      let newStart = Math.max(0, action.newStartFrame);

      if (state.snappingEnabled) {
        const snapThreshold = 6; // frames
        const snapPoints = [0, state.currentFrame];

        // Collect other clips' boundaries
        for (const other of state.clips) {
          if (other.id !== clip.id) {
            snapPoints.push(other.timelineStartFrame);
            snapPoints.push(other.timelineStartFrame + other.durationInFrames);
          }
        }

        // Check head snapping
        for (const p of snapPoints) {
          if (Math.abs(newStart - p) <= snapThreshold) {
            newStart = p;
            break;
          }
        }

        // Check tail snapping
        for (const p of snapPoints) {
          const tail = newStart + clip.durationInFrames;
          if (Math.abs(tail - p) <= snapThreshold) {
            newStart = Math.max(0, p - clip.durationInFrames);
            break;
          }
        }
      }

      const updatedClips = state.clips.map((c) =>
        c.id === action.clipId ? { ...c, timelineStartFrame: newStart } : c
      );

      return {
        ...state,
        clips: updatedClips,
        totalDurationInFrames: recalculateDuration(updatedClips, state.totalDurationInFrames),
        saveStatus: "unsaved",
      };
    }

    case "TRIM_CLIP_START": {
      const clip = state.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;

      const requestedStart = Math.max(0, action.newStartFrame);
      const diff = requestedStart - clip.timelineStartFrame;
      const newSourceStart = clip.sourceStartFrame + diff;
      const newDuration = clip.durationInFrames - diff;

      // Minimum clip length 5 frames, sourceStart cannot be negative or exceed media
      if (newDuration < 5 || newSourceStart < 0 || newSourceStart >= clip.sourceDurationInFrames) {
        return state;
      }

      const updatedClips = state.clips.map((c) =>
        c.id === action.clipId
          ? {
              ...c,
              timelineStartFrame: requestedStart,
              sourceStartFrame: newSourceStart,
              durationInFrames: newDuration,
            }
          : c
      );

      return {
        ...state,
        clips: updatedClips,
        totalDurationInFrames: recalculateDuration(updatedClips, state.totalDurationInFrames),
        saveStatus: "unsaved",
      };
    }

    case "TRIM_CLIP_END": {
      const clip = state.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;

      const maxAvailable = clip.sourceDurationInFrames - clip.sourceStartFrame;
      const newDuration = Math.max(5, Math.min(action.newDurationInFrames, maxAvailable));

      const updatedClips = state.clips.map((c) =>
        c.id === action.clipId ? { ...c, durationInFrames: newDuration } : c
      );

      return {
        ...state,
        clips: updatedClips,
        totalDurationInFrames: recalculateDuration(updatedClips, state.totalDurationInFrames),
        saveStatus: "unsaved",
      };
    }

    case "SPLIT_CLIP_AT_PLAYHEAD": {
      if (!state.selectedClipId) return state;
      const clip = state.clips.find((c) => c.id === state.selectedClipId);
      if (!clip) return state;

      // Playhead must fall strictly within the clip
      const playhead = state.currentFrame;
      if (playhead <= clip.timelineStartFrame || playhead >= clip.timelineStartFrame + clip.durationInFrames) {
        return state;
      }

      const offset = playhead - clip.timelineStartFrame;
      const firstDuration = offset;
      const secondDuration = clip.durationInFrames - offset;

      const firstClip: Clip = {
        ...clip,
        durationInFrames: firstDuration,
      };

      const secondClipId = `clip-${Date.now().toString(36)}-${random(null).toString(36).substring(2, 6)}`;
      const secondClip: Clip = {
        ...clip,
        id: secondClipId,
        name: `${clip.name.replace(/ \(Part \d+\)$/, "")} (Part 2)`,
        timelineStartFrame: playhead,
        durationInFrames: secondDuration,
        sourceStartFrame: clip.sourceStartFrame + firstDuration,
      };

      const updatedClips = state.clips
        .flatMap((c) => (c.id === clip.id ? [firstClip, secondClip] : [c]))
        .sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);

      return {
        ...state,
        clips: updatedClips,
        selectedClipId: secondClipId,
        saveStatus: "unsaved",
      };
    }

    case "DELETE_CLIP": {
      const targetId = action.clipId || state.selectedClipId;
      if (!targetId) return state;

      const updatedClips = state.clips.filter((c) => c.id !== targetId);

      return {
        ...state,
        clips: updatedClips,
        selectedClipId: null,
        totalDurationInFrames: recalculateDuration(updatedClips, state.totalDurationInFrames),
        saveStatus: "unsaved",
      };
    }

    case "UPDATE_CLIP_PROPERTIES": {
      const updatedClips = state.clips.map((c) =>
        c.id === action.clipId ? { ...c, ...action.properties } : c
      );
      return {
        ...state,
        clips: updatedClips,
        saveStatus: "unsaved",
      };
    }

    case "TOGGLE_TRACK_MUTE": {
      const updatedTracks = state.tracks.map((t) =>
        t.id === action.trackId ? { ...t, muted: !t.muted } : t
      );
      return { ...state, tracks: updatedTracks };
    }

    case "TOGGLE_TRACK_LOCK": {
      const updatedTracks = state.tracks.map((t) =>
        t.id === action.trackId ? { ...t, locked: !t.locked } : t
      );
      return { ...state, tracks: updatedTracks };
    }

    case "TOGGLE_TRACK_VISIBLE": {
      const updatedTracks = state.tracks.map((t) =>
        t.id === action.trackId ? { ...t, visible: t.visible === false ? true : false } : t
      );
      return { ...state, tracks: updatedTracks };
    }

    case "SET_EXPORT_DIALOG_OPEN": {
      return { ...state, isExportDialogOpen: action.isOpen };
    }

    case "RESTORE_SNAPSHOT": {
      return {
        ...state,
        clips: action.snapshot.clips,
        tracks: action.snapshot.tracks,
        selectedClipId: action.snapshot.selectedClipId,
        totalDurationInFrames: action.snapshot.totalDurationInFrames,
        saveStatus: "unsaved",
      };
    }

    case "SET_TOTAL_DURATION": {
      return {
        ...state,
        totalDurationInFrames: Math.max(state.totalDurationInFrames, action.duration),
      };
    }

    case "RENAME_PROJECT": {
      return {
        ...state,
        projectName: action.name,
        saveStatus: "unsaved",
      };
    }

    case "ADD_ASSET": {
      return {
        ...state,
        assets: [...state.assets, action.asset],
      };
    }

    default:
      return state;
  }
}

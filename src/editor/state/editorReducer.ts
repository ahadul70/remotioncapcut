import {
  Clip,
  EditorState,
  HistorySnapshot,
  MediaAsset,
  Track,
} from "./editorTypes";

export type Action =
  | { type: "SET_PLAYHEAD"; frame: number }
  | { type: "SET_IS_PLAYING"; isPlaying: boolean }
  | { type: "SELECT_CLIP"; id: string | null }
  | { type: "SET_ACTIVE_TOOL"; tool: EditorState["activeTool"] }
  | { type: "SET_SIDEBAR_TAB"; tab: EditorState["activeSidebarTab"] }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "TOGGLE_SNAPPING" }
  | { type: "MOVE_CLIP"; clipId: string; newStartFrame: number; targetTrackId?: string }
  | { type: "TRIM_CLIP_START"; clipId: string; newStartFrame: number }
  | { type: "TRIM_CLIP_END"; clipId: string; newDurationInFrames: number }
  | { type: "SPLIT_CLIP_AT_PLAYHEAD"; frame?: number }
  | { type: "DELETE_CLIP"; clipId?: string }
  | { type: "UPDATE_CLIP_PROPERTIES"; clipId: string; properties: Partial<Clip> }
  | { type: "TOGGLE_TRACK_MUTE"; trackId: string }
  | { type: "TOGGLE_TRACK_LOCK"; trackId: string }
  | { type: "TOGGLE_TRACK_VISIBLE"; trackId: string }
  | { type: "ADD_TRACK"; trackType: "video" | "audio" }
  | { type: "DELETE_TRACK"; trackId: string }
  | { type: "SET_EXPORT_DIALOG_OPEN"; isOpen: boolean }
  | { type: "RESTORE_SNAPSHOT"; snapshot: HistorySnapshot }
  | { type: "SET_TOTAL_DURATION"; duration: number }
  | { type: "RENAME_PROJECT"; name: string }
  | { type: "ADD_ASSET"; asset: MediaAsset }
  | { type: "ADD_ASSETS"; assets: MediaAsset[] };

const DEFAULT_MIN_DURATION = 2319; // ~77s default timeline base (covers 2289f TEST.mp4 + 30f padding)

function recalculateDuration(clips: Clip[], defaultDuration: number = DEFAULT_MIN_DURATION): number {
  if (clips.length === 0) return defaultDuration;
  const maxEnd = Math.max(...clips.map((c) => c.timelineStartFrame + c.durationInFrames));
  return Math.max(DEFAULT_MIN_DURATION, maxEnd + 30); // 1 sec padding at end
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
      const zoom = Math.max(0.1, Math.min(action.zoom, 40));
      return { ...state, zoom };
    }

    case "TOGGLE_SNAPPING": {
      return { ...state, snappingEnabled: !state.snappingEnabled };
    }

    case "MOVE_CLIP": {
      const clip = state.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;

      // Reject if current track is locked
      const currentTrack = state.tracks.find((t) => t.id === clip.trackId);
      if (currentTrack?.locked) return state;

      let targetTrackId = clip.trackId;
      if (action.targetTrackId && action.targetTrackId !== clip.trackId) {
        const destTrack = state.tracks.find((t) => t.id === action.targetTrackId);
        // Destination track must exist, not be locked, and match media type
        if (!destTrack || destTrack.locked || destTrack.type !== clip.type) {
          return state;
        }
        targetTrackId = destTrack.id;
      }

      let newStart = Math.max(0, action.newStartFrame);

      if (state.snappingEnabled) {
        // Dynamic snap threshold in frames (~10px on screen, minimum 3 frames)
        const snapThreshold = Math.max(3, Math.round(10 / state.zoom));
        const snapPoints = [0, state.currentFrame];

        // Collect other clips' boundaries on the target track
        for (const other of state.clips) {
          if (other.id !== clip.id && other.trackId === targetTrackId) {
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
        c.id === action.clipId
          ? { ...c, timelineStartFrame: newStart, trackId: targetTrackId }
          : c
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

      // Reject if track is locked
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) return state;

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

      // Reject if track is locked
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) return state;

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
      const playhead = action.frame !== undefined ? action.frame : state.currentFrame;

      // Find target clip: either currently selected clip, or clip located under the playhead
      let clip = state.selectedClipId
        ? state.clips.find((c) => c.id === state.selectedClipId)
        : null;

      // If selected clip doesn't contain playhead, try finding any clip containing playhead
      if (!clip || playhead <= clip.timelineStartFrame || playhead >= clip.timelineStartFrame + clip.durationInFrames) {
        clip =
          state.clips.find(
            (c) => playhead > c.timelineStartFrame && playhead < c.timelineStartFrame + c.durationInFrames
          ) || null;
      }

      if (!clip) return state;

      // Reject if clip's track is locked
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) return state;

      const offset = playhead - clip.timelineStartFrame;
      const firstDuration = offset;
      const secondDuration = clip.durationInFrames - offset;

      // Must have at least 1 frame per part
      if (firstDuration < 1 || secondDuration < 1) return state;

      const baseName = clip.name.replace(/ \(Part \d+\)$/, "");
      const existingPartMatch = clip.name.match(/\(Part (\d+)\)$/);
      const firstPartNum = existingPartMatch ? parseInt(existingPartMatch[1], 10) : 1;
      const secondPartNum = firstPartNum + 1;

      const firstClip: Clip = {
        ...clip,
        name: existingPartMatch ? clip.name : `${baseName} (Part 1)`,
        durationInFrames: firstDuration,
      };

      const secondClipId = `clip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const secondClip: Clip = {
        ...clip,
        id: secondClipId,
        name: `${baseName} (Part ${secondPartNum})`,
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

      const clip = state.clips.find((c) => c.id === targetId);
      if (!clip) return state;

      // Reject if clip's track is locked
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) return state;

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
      const clip = state.clips.find((c) => c.id === action.clipId);
      if (!clip) return state;

      const currentTrack = state.tracks.find((t) => t.id === clip.trackId);
      if (currentTrack?.locked) return state;

      // Check track change validity
      const validProps = { ...action.properties };
      if (validProps.trackId && validProps.trackId !== clip.trackId) {
        const destTrack = state.tracks.find((t) => t.id === validProps.trackId);
        if (!destTrack || destTrack.locked || destTrack.type !== clip.type) {
          delete validProps.trackId;
        }
      }

      const updatedClips = state.clips.map((c) =>
        c.id === action.clipId ? { ...c, ...validProps } : c
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
      return { ...state, tracks: updatedTracks, saveStatus: "unsaved" };
    }

    case "TOGGLE_TRACK_LOCK": {
      const updatedTracks = state.tracks.map((t) =>
        t.id === action.trackId ? { ...t, locked: !t.locked } : t
      );
      return { ...state, tracks: updatedTracks, saveStatus: "unsaved" };
    }

    case "TOGGLE_TRACK_VISIBLE": {
      const updatedTracks = state.tracks.map((t) =>
        t.id === action.trackId ? { ...t, visible: t.visible === false ? true : false } : t
      );
      return { ...state, tracks: updatedTracks, saveStatus: "unsaved" };
    }

    case "ADD_TRACK": {
      const isVideo = action.trackType === "video";
      const existingSameType = state.tracks.filter((t) => t.type === action.trackType);
      const nextNum = existingSameType.length + 1;
      const prefix = isVideo ? "track-v" : "track-a";
      let trackId = `${prefix}${nextNum}`;
      while (state.tracks.some((t) => t.id === trackId)) {
        trackId = `${prefix}${Math.random().toString(36).substring(2, 6)}`;
      }

      const name = isVideo ? `V${nextNum} Video` : `A${nextNum} Audio`;
      const newTrack: Track = {
        id: trackId,
        type: action.trackType,
        name,
        visible: true,
        muted: false,
        locked: false,
      };

      let updatedTracks: Track[];
      if (isVideo) {
        // Place new video track after existing video tracks
        const lastVideoIdx = state.tracks.reduce((max, t, i) => (t.type === "video" ? i : max), -1);
        if (lastVideoIdx >= 0) {
          updatedTracks = [
            ...state.tracks.slice(0, lastVideoIdx + 1),
            newTrack,
            ...state.tracks.slice(lastVideoIdx + 1),
          ];
        } else {
          updatedTracks = [newTrack, ...state.tracks];
        }
      } else {
        // Append audio track at the bottom
        updatedTracks = [...state.tracks, newTrack];
      }

      return {
        ...state,
        tracks: updatedTracks,
        saveStatus: "unsaved",
      };
    }

    case "DELETE_TRACK": {
      const targetTrack = state.tracks.find((t) => t.id === action.trackId);
      if (!targetTrack || targetTrack.locked) return state;

      // Keep at least 1 track of each type
      const sameTypeTracks = state.tracks.filter((t) => t.type === targetTrack.type);
      if (sameTypeTracks.length <= 1) return state;

      const updatedTracks = state.tracks.filter((t) => t.id !== action.trackId);
      const updatedClips = state.clips.filter((c) => c.trackId !== action.trackId);

      return {
        ...state,
        tracks: updatedTracks,
        clips: updatedClips,
        selectedClipId:
          state.selectedClipId && updatedClips.some((c) => c.id === state.selectedClipId)
            ? state.selectedClipId
            : null,
        totalDurationInFrames: recalculateDuration(updatedClips, state.totalDurationInFrames),
        saveStatus: "unsaved",
      };
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

    case "ADD_ASSETS": {
      return {
        ...state,
        assets: [...state.assets, ...action.assets],
      };
    }

    default:
      return state;
  }
}

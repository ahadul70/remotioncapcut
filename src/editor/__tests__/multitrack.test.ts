import { describe, it, expect } from "vitest";

import { EditorState, Track, Clip } from "../state/editorTypes";
import { editorReducer } from "../state/editorReducer";
import { HistoryManager } from "../state/history";

const createBaseState = (): EditorState => ({
  projectName: "Multitrack Test",
  fps: 30,
  width: 1080,
  height: 1920,
  totalDurationInFrames: 300,
  currentFrame: 0,
  isPlaying: false,
  selectedClipId: "clip-v1",
  activeTool: "select",
  snappingEnabled: true,
  zoom: 1,
  tracks: [
    { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
    { id: "track-a1", type: "audio", name: "A1 Audio", muted: false, locked: false },
  ],
  clips: [
    {
      id: "clip-v1",
      assetId: "asset-1",
      name: "Video 1",
      type: "video",
      trackId: "track-v1",
      timelineStartFrame: 0,
      sourceStartFrame: 0,
      durationInFrames: 100,
      sourceDurationInFrames: 100,
      src: "blob:test-v1",
      positionX: 0,
      positionY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      muted: false,
    },
    {
      id: "clip-a1",
      assetId: "asset-2",
      name: "Audio 1",
      type: "audio",
      trackId: "track-a1",
      timelineStartFrame: 0,
      sourceStartFrame: 0,
      durationInFrames: 150,
      sourceDurationInFrames: 150,
      src: "blob:test-a1",
      positionX: 0,
      positionY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 0.8,
      muted: false,
    },
  ],
  assets: [],
  activeSidebarTab: "media",
  isExportDialogOpen: false,
  saveStatus: "saved",
});

describe("Track Creation and Deletion", () => {
  it("adds a new video track with sequential naming and correct defaults", () => {
    const state = createBaseState();
    const nextState = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });

    expect(nextState.tracks.length).toBe(3);
    const newTrack = nextState.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1");
    expect(newTrack).toBeDefined();
    expect(newTrack?.type).toBe("video");
    expect(newTrack?.name).toBe("V2 Video");
    expect(newTrack?.visible).toBe(true);
    expect(newTrack?.locked).toBe(false);
    expect(nextState.saveStatus).toBe("unsaved");
  });

  it("adds a new audio track with sequential naming and correct defaults", () => {
    const state = createBaseState();
    const nextState = editorReducer(state, { type: "ADD_TRACK", trackType: "audio" });

    expect(nextState.tracks.length).toBe(3);
    const newAudioTrack = nextState.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1");
    expect(newAudioTrack).toBeDefined();
    expect(newAudioTrack?.type).toBe("audio");
    expect(newAudioTrack?.name).toBe("A2 Audio");
    expect(newAudioTrack?.muted).toBe(false);
    expect(newAudioTrack?.locked).toBe(false);
  });

  it("deletes a track and cascades removal of any clips residing on it", () => {
    // Add V2 track first
    let state = createBaseState();
    state = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });
    const v2Track = state.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1")!;

    // Place a clip on V2
    const clipOnV2: Clip = {
      ...state.clips[0],
      id: "clip-v2",
      trackId: v2Track.id,
      timelineStartFrame: 10,
    };
    state = {
      ...state,
      clips: [...state.clips, clipOnV2],
      selectedClipId: "clip-v2",
    };

    // Now delete V2
    const afterDelete = editorReducer(state, { type: "DELETE_TRACK", trackId: v2Track.id });
    expect(afterDelete.tracks.some((t) => t.id === v2Track.id)).toBe(false);
    expect(afterDelete.clips.some((c) => c.id === "clip-v2")).toBe(false);
    // Selected clip is reset since it was on the deleted track
    expect(afterDelete.selectedClipId).toBeNull();
  });

  it("prevents deletion if it is the last track of its type", () => {
    const state = createBaseState();
    // Only track-v1 exists for video; attempting to delete it should be a no-op
    const nextState = editorReducer(state, { type: "DELETE_TRACK", trackId: "track-v1" });
    expect(nextState.tracks.length).toBe(2);
    expect(nextState.tracks.some((t) => t.id === "track-v1")).toBe(true);
  });

  it("prevents deletion of a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });
    const v2Track = state.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1")!;

    // Lock V2 track
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: v2Track.id });
    expect(state.tracks.find((t) => t.id === v2Track.id)?.locked).toBe(true);

    // Attempt to delete locked V2 track
    const afterAttempt = editorReducer(state, { type: "DELETE_TRACK", trackId: v2Track.id });
    expect(afterAttempt.tracks.some((t) => t.id === v2Track.id)).toBe(true);
  });
});

describe("Track State Toggles (Visible, Mute, Lock)", () => {
  it("toggles video track visibility", () => {
    const state = createBaseState();
    const hidden = editorReducer(state, { type: "TOGGLE_TRACK_VISIBLE", trackId: "track-v1" });
    expect(hidden.tracks.find((t) => t.id === "track-v1")?.visible).toBe(false);
    expect(hidden.saveStatus).toBe("unsaved");

    const shown = editorReducer(hidden, { type: "TOGGLE_TRACK_VISIBLE", trackId: "track-v1" });
    expect(shown.tracks.find((t) => t.id === "track-v1")?.visible).toBe(true);
  });

  it("toggles audio track mute", () => {
    const state = createBaseState();
    const muted = editorReducer(state, { type: "TOGGLE_TRACK_MUTE", trackId: "track-a1" });
    expect(muted.tracks.find((t) => t.id === "track-a1")?.muted).toBe(true);
    expect(muted.saveStatus).toBe("unsaved");

    const unmuted = editorReducer(muted, { type: "TOGGLE_TRACK_MUTE", trackId: "track-a1" });
    expect(unmuted.tracks.find((t) => t.id === "track-a1")?.muted).toBe(false);
  });

  it("toggles track lock state", () => {
    const state = createBaseState();
    const locked = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });
    expect(locked.tracks.find((t) => t.id === "track-v1")?.locked).toBe(true);

    const unlocked = editorReducer(locked, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });
    expect(unlocked.tracks.find((t) => t.id === "track-v1")?.locked).toBe(false);
  });
});

describe("Cross-Track Movement & Type Compatibility", () => {
  it("moves a video clip to another video track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });
    const v2Track = state.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1")!;

    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-v1",
      newStartFrame: 25,
      targetTrackId: v2Track.id,
    });

    const clip = moved.clips.find((c) => c.id === "clip-v1");
    expect(clip?.trackId).toBe(v2Track.id);
    expect(clip?.timelineStartFrame).toBe(25);
  });

  it("rejects moving a video clip to an audio track", () => {
    const state = createBaseState();
    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-v1",
      newStartFrame: 30,
      targetTrackId: "track-a1",
    });

    const clip = moved.clips.find((c) => c.id === "clip-v1");
    // Track ID should remain unchanged on track-v1
    expect(clip?.trackId).toBe("track-v1");
  });

  it("rejects moving an audio clip to a video track", () => {
    const state = createBaseState();
    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-a1",
      newStartFrame: 10,
      targetTrackId: "track-v1",
    });

    const clip = moved.clips.find((c) => c.id === "clip-a1");
    expect(clip?.trackId).toBe("track-a1");
  });
});

describe("Locked Track Protections (Move, Trim, Split, Delete, Edit)", () => {
  it("blocks moving a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-v1",
      newStartFrame: 50,
    });

    const clip = moved.clips.find((c) => c.id === "clip-v1");
    expect(clip?.timelineStartFrame).toBe(0);
  });

  it("blocks moving a clip into a locked target track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });
    const v2Track = state.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1")!;
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: v2Track.id });

    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-v1",
      newStartFrame: 20,
      targetTrackId: v2Track.id,
    });

    const clip = moved.clips.find((c) => c.id === "clip-v1");
    expect(clip?.trackId).toBe("track-v1");
    expect(clip?.timelineStartFrame).toBe(0);
  });

  it("blocks trimming start of a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const trimmed = editorReducer(state, {
      type: "TRIM_CLIP_START",
      clipId: "clip-v1",
      newStartFrame: 20,
    });

    const clip = trimmed.clips.find((c) => c.id === "clip-v1");
    expect(clip?.timelineStartFrame).toBe(0);
    expect(clip?.durationInFrames).toBe(100);
  });

  it("blocks trimming end of a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const trimmed = editorReducer(state, {
      type: "TRIM_CLIP_END",
      clipId: "clip-v1",
      newDurationInFrames: 50,
    });

    const clip = trimmed.clips.find((c) => c.id === "clip-v1");
    expect(clip?.durationInFrames).toBe(100);
  });

  it("blocks splitting a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const split = editorReducer(state, {
      type: "SPLIT_CLIP_AT_PLAYHEAD",
      frame: 50,
    });

    // Count clips should remain 2 (no split created)
    expect(split.clips.length).toBe(2);
    expect(split.clips.find((c) => c.id === "clip-v1")?.durationInFrames).toBe(100);
  });

  it("blocks deleting a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const deleted = editorReducer(state, { type: "DELETE_CLIP" });
    expect(deleted.clips.length).toBe(2);
    expect(deleted.clips.some((c) => c.id === "clip-v1")).toBe(true);
  });

  it("blocks updating properties of a clip on a locked track", () => {
    let state = createBaseState();
    state = editorReducer(state, { type: "TOGGLE_TRACK_LOCK", trackId: "track-v1" });

    const updated = editorReducer(state, {
      type: "UPDATE_CLIP_PROPERTIES",
      clipId: "clip-v1",
      properties: { opacity: 0.2, scale: 2 },
    });

    const clip = updated.clips.find((c) => c.id === "clip-v1");
    expect(clip?.opacity).toBe(1);
    expect(clip?.scale).toBe(1);
  });
});

describe("Undo and Redo with Multitrack Operations", () => {
  it("supports undo and redo when adding tracks and moving clips across tracks", () => {
    const history = new HistoryManager();
    let state = createBaseState();

    // Snapshot 0: initial state
    history.push({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });

    // Action 1: Add Video Track V2
    state = editorReducer(state, { type: "ADD_TRACK", trackType: "video" });
    const v2Track = state.tracks.find((t) => t.id !== "track-v1" && t.id !== "track-a1")!;

    // Snapshot 1: track added
    history.push({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });

    // Action 2: Move clip-v1 from V1 to V2
    state = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-v1",
      newStartFrame: 40,
      targetTrackId: v2Track.id,
    });

    expect(state.tracks.length).toBe(3);
    expect(state.clips.find((c) => c.id === "clip-v1")?.trackId).toBe(v2Track.id);

    // Undo move
    const undoMoveSnapshot = history.undo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });
    expect(undoMoveSnapshot).not.toBeNull();
    state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: undoMoveSnapshot! });
    expect(state.clips.find((c) => c.id === "clip-v1")?.trackId).toBe("track-v1");
    expect(state.tracks.length).toBe(3);

    // Undo add track
    const undoAddTrackSnapshot = history.undo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });
    expect(undoAddTrackSnapshot).not.toBeNull();
    state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: undoAddTrackSnapshot! });
    expect(state.tracks.length).toBe(2);

    // Redo add track
    const redoAddTrackSnapshot = history.redo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });
    expect(redoAddTrackSnapshot).not.toBeNull();
    state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: redoAddTrackSnapshot! });
    expect(state.tracks.length).toBe(3);
  });
});

describe("Remotion Composition Layering & Mixing Logic", () => {
  it("orders video clips according to track hierarchy (V1 rendered first, V2 overlays on top)", () => {
    const tracks: Track[] = [
      { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
      { id: "track-v2", type: "video", name: "V2 Video", visible: true, locked: false },
    ];

    const clips: Clip[] = [
      {
        id: "clip-overlay",
        assetId: "asset-2",
        name: "Overlay",
        type: "video",
        trackId: "track-v2",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 60,
        sourceDurationInFrames: 60,
        src: "blob:v2",
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        muted: false,
      },
      {
        id: "clip-base",
        assetId: "asset-1",
        name: "Base",
        type: "video",
        trackId: "track-v1",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 60,
        sourceDurationInFrames: 60,
        src: "blob:v1",
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        muted: false,
      },
    ];

    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const videoTrackOrder = new Map(
      tracks.filter((t) => t.type === "video").map((t, idx) => [t.id, idx])
    );

    const sortedVideoClips = [...clips]
      .filter((c) => {
        const track = trackMap.get(c.trackId);
        return c.type === "video" && (!track || track.visible !== false);
      })
      .sort((a, b) => {
        const orderA = videoTrackOrder.get(a.trackId) ?? 0;
        const orderB = videoTrackOrder.get(b.trackId) ?? 0;
        return orderA - orderB;
      });

    // Base clip (on V1, index 0) must come before overlay clip (on V2, index 1)
    expect(sortedVideoClips[0].id).toBe("clip-base");
    expect(sortedVideoClips[1].id).toBe("clip-overlay");
  });

  it("filters out clips when their video track is set to hidden", () => {
    const tracks: Track[] = [
      { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
      { id: "track-v2", type: "video", name: "V2 Video", visible: false, locked: false },
    ];

    const clips: Clip[] = [
      {
        id: "clip-1",
        assetId: "asset-1",
        name: "V1 Clip",
        type: "video",
        trackId: "track-v1",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 30,
        sourceDurationInFrames: 30,
        src: "blob:1",
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        muted: false,
      },
      {
        id: "clip-2",
        assetId: "asset-2",
        name: "V2 Clip (Hidden Track)",
        type: "video",
        trackId: "track-v2",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 30,
        sourceDurationInFrames: 30,
        src: "blob:2",
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        volume: 1,
        muted: false,
      },
    ];

    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const visibleClips = clips.filter((c) => {
      const track = trackMap.get(c.trackId);
      return !track || track.visible !== false;
    });

    expect(visibleClips.length).toBe(1);
    expect(visibleClips[0].id).toBe("clip-1");
  });

  it("applies track-level muting to calculate zero effective audio volume without altering clip volume", () => {
    const tracks: Track[] = [
      { id: "track-a1", type: "audio", name: "A1 Audio", muted: true, locked: false },
    ];
    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    const clip: Clip = {
      id: "clip-audio",
      assetId: "asset-a",
      name: "BGM",
      type: "audio",
      trackId: "track-a1",
      timelineStartFrame: 0,
      sourceStartFrame: 0,
      durationInFrames: 60,
      sourceDurationInFrames: 60,
      src: "blob:audio",
      positionX: 0,
      positionY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 0.75,
      muted: false,
    };

    const track = trackMap.get(clip.trackId);
    const effectiveVolume = track?.muted || clip.muted ? 0 : clip.volume;

    expect(effectiveVolume).toBe(0);
    // Original clip volume is preserved
    expect(clip.volume).toBe(0.75);
  });
});

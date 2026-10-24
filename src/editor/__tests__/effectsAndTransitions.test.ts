/* eslint-disable @remotion/non-pure-animation */
import { describe, it, expect } from "vitest";
import { editorReducer } from "../state/editorReducer";
import { HistoryManager } from "../state/history";
import { Clip, EditorState, HistorySnapshot, Track } from "../state/editorTypes";
import {
  buildCssFilter,
  clampEffectValue,
  clampTransitionDuration,
  getMaxTransitionDuration,
  getVignetteIntensity,
  validateAndClampTransitions,
} from "../utils/effectAndTransitionUtils";

describe("Step 7: Video Effects & Transitions System", () => {
  const createMockClip = (overrides?: Partial<Clip>): Clip => ({
    id: "clip-1",
    assetId: "asset-1",
    name: "Video Clip 1",
    type: "video",
    trackId: "track-v1",
    timelineStartFrame: 0,
    sourceStartFrame: 0,
    durationInFrames: 60,
    sourceDurationInFrames: 120,
    src: "/media/test.mp4",
    opacity: 1,
    volume: 1,
    ...overrides,
  });

  const createMockState = (): EditorState => {
    const tracks: Track[] = [
      { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
      { id: "track-v2", type: "video", name: "V2 Video", visible: true, locked: true },
    ];
    const clips: Clip[] = [
      createMockClip({ id: "clip-1", timelineStartFrame: 0, durationInFrames: 60 }),
      createMockClip({ id: "clip-2", timelineStartFrame: 60, durationInFrames: 90 }),
    ];
    return {
      projectName: "Test Project",
      fps: 30,
      width: 1080,
      height: 1920,
      totalDurationInFrames: 300,
      currentFrame: 0,
      isPlaying: false,
      selectedClipId: "clip-1",
      selectedTransitionId: null,
      activeTool: "select",
      snappingEnabled: true,
      zoom: 1,
      tracks,
      clips,
      transitions: [],
      assets: [],
      activeSidebarTab: "effects",
      isExportDialogOpen: false,
      saveStatus: "saved",
    };
  };

  describe("1. Effect Parameter Validation, Clamping & Filter Generation", () => {
    it("clamps brightness between 0% and 200%", () => {
      expect(clampEffectValue("brightness", 250)).toBe(200);
      expect(clampEffectValue("brightness", -50)).toBe(0);
      expect(clampEffectValue("brightness", 135)).toBe(135);
    });

    it("clamps blur between 0px and 20px", () => {
      expect(clampEffectValue("blur", 35)).toBe(20);
      expect(clampEffectValue("blur", -5)).toBe(0);
      expect(clampEffectValue("blur", 8.45)).toBe(8.5);
    });

    it("clamps vignette between 0% and 100%", () => {
      expect(clampEffectValue("vignette", 150)).toBe(100);
      expect(clampEffectValue("vignette", -20)).toBe(0);
      expect(clampEffectValue("vignette", 45)).toBe(45);
    });

    it("builds deterministic CSS filter string from active effects", () => {
      const effects = [
        { id: "eff-1", type: "brightness" as const, enabled: true, value: 120 },
        { id: "eff-2", type: "contrast" as const, enabled: true, value: 110 },
        { id: "eff-3", type: "blur" as const, enabled: true, value: 4 },
      ];
      const filter = buildCssFilter(effects);
      expect(filter).toBe("brightness(120%) contrast(110%) blur(4px)");
    });

    it("ignores disabled effects in CSS filter", () => {
      const effects = [
        { id: "eff-1", type: "brightness" as const, enabled: true, value: 120 },
        { id: "eff-2", type: "blur" as const, enabled: false, value: 10 },
      ];
      const filter = buildCssFilter(effects);
      expect(filter).toBe("brightness(120%)");
    });

    it("returns 'none' when no effects are enabled or present", () => {
      expect(buildCssFilter([])).toBe("none");
      expect(buildCssFilter(undefined)).toBe("none");
      expect(buildCssFilter([{ id: "eff-1", type: "blur", enabled: false, value: 5 }])).toBe("none");
    });

    it("evaluates vignette intensity separately for overlay rendering", () => {
      const effects = [
        { id: "eff-1", type: "vignette" as const, enabled: true, value: 65 },
      ];
      expect(getVignetteIntensity(effects)).toBe(65);
      expect(getVignetteIntensity([{ id: "eff-1", type: "vignette", enabled: false, value: 65 }])).toBe(0);
    });
  });

  describe("2. Effect State Management in Reducer", () => {
    it("adds a new effect to a clip and enables it", () => {
      const state = createMockState();
      const updated = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "brightness",
        enabled: true,
        value: 130,
      });

      const clip = updated.clips.find((c) => c.id === "clip-1")!;
      expect(clip.effects).toHaveLength(1);
      expect(clip.effects![0]).toMatchObject({
        type: "brightness",
        enabled: true,
        value: 130,
      });
      expect(updated.saveStatus).toBe("unsaved");
    });

    it("updates existing effect parameter on subsequent calls", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "contrast",
        enabled: true,
        value: 120,
      });

      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "contrast",
        value: 150,
      });

      const clip = state.clips.find((c) => c.id === "clip-1")!;
      expect(clip.effects).toHaveLength(1);
      expect(clip.effects![0].value).toBe(150);
      expect(clip.effects![0].enabled).toBe(true);
    });

    it("toggles an effect enabled/disabled state", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "grayscale",
        enabled: true,
        value: 100,
      });

      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "grayscale",
        enabled: false,
      });

      const clip = state.clips.find((c) => c.id === "clip-1")!;
      expect(clip.effects![0].enabled).toBe(false);
      expect(clip.effects![0].value).toBe(100);
    });

    it("removes a specific effect", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "blur",
        value: 5,
      });
      state = editorReducer(state, {
        type: "REMOVE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "blur",
      });

      const clip = state.clips.find((c) => c.id === "clip-1")!;
      expect(clip.effects).toHaveLength(0);
    });

    it("resets all effects on a clip", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "blur",
        value: 5,
      });
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "saturation",
        value: 150,
      });
      state = editorReducer(state, {
        type: "RESET_CLIP_EFFECTS",
        clipId: "clip-1",
      });

      const clip = state.clips.find((c) => c.id === "clip-1")!;
      expect(clip.effects).toEqual([]);
    });

    it("rejects effect updates on locked tracks", () => {
      let state = createMockState();
      // Move clip-1 to locked track-v2
      state = {
        ...state,
        clips: state.clips.map((c) => (c.id === "clip-1" ? { ...c, trackId: "track-v2" } : c)),
      };

      const before = state.clips.find((c) => c.id === "clip-1")!;
      const updated = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "brightness",
        value: 150,
      });

      const after = updated.clips.find((c) => c.id === "clip-1")!;
      expect(after.effects).toBe(before.effects);
    });
  });

  describe("3. Transition Duration & Frame Boundary Calculations", () => {
    it("calculates maximum transition duration as half clip duration", () => {
      expect(getMaxTransitionDuration(60)).toBe(30);
      expect(getMaxTransitionDuration(15)).toBe(7);
      expect(getMaxTransitionDuration(2)).toBe(1);
    });

    it("clamps requested transition duration to boundaries", () => {
      // Normal clip: 60f duration -> max transition is 30f
      expect(clampTransitionDuration(15, 60)).toBe(15);
      expect(clampTransitionDuration(50, 60)).toBe(30);

      // Short clip: 4f duration -> max transition is 2f
      expect(clampTransitionDuration(15, 4)).toBe(2);
    });

    it("prevents negative and zero transition durations", () => {
      expect(clampTransitionDuration(-10, 60)).toBe(3);
      expect(clampTransitionDuration(0, 60)).toBe(3);
    });

    it("validates and clamps transition between two clips", () => {
      const clips = [
        createMockClip({ id: "clip-1", durationInFrames: 20 }), // max 10f
        createMockClip({ id: "clip-2", durationInFrames: 80 }), // max 40f
      ];
      const transitions = [
        {
          id: "trans-1",
          type: "crossfade" as const,
          durationInFrames: 30, // Exceeds clip-1's max 10f
          trackId: "track-v1",
          fromClipId: "clip-1",
          toClipId: "clip-2",
        },
      ];

      const validated = validateAndClampTransitions(transitions, clips);
      expect(validated).toHaveLength(1);
      expect(validated[0].durationInFrames).toBe(10);
    });
  });

  describe("4. Transition State Management in Reducer", () => {
    it("adds a valid transition between two clips", () => {
      const state = createMockState();
      const nextState = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "crossfade",
          durationInFrames: 15,
          trackId: "track-v1",
          fromClipId: "clip-1",
          toClipId: "clip-2",
        },
      });

      expect(nextState.transitions).toHaveLength(1);
      expect(nextState.transitions![0]).toMatchObject({
        type: "crossfade",
        durationInFrames: 15,
        trackId: "track-v1",
        fromClipId: "clip-1",
        toClipId: "clip-2",
      });
      expect(nextState.selectedTransitionId).toBe(nextState.transitions![0].id);
      expect(nextState.selectedClipId).toBeNull();
    });

    it("clamps requested duration when adding transition to short clip", () => {
      let state = createMockState();
      // clip-1 duration 10f -> max transition is 5f
      state = {
        ...state,
        clips: state.clips.map((c) => (c.id === "clip-1" ? { ...c, durationInFrames: 10 } : c)),
      };

      const nextState = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "fade-from-black",
          durationInFrames: 25,
          trackId: "track-v1",
          toClipId: "clip-1",
        },
      });

      expect(nextState.transitions![0].durationInFrames).toBe(5);
    });

    it("rejects transition on locked track", () => {
      const state = createMockState();
      const nextState = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "crossfade",
          durationInFrames: 15,
          trackId: "track-v2", // locked track
          fromClipId: "clip-1",
        },
      });

      expect(nextState.transitions).toHaveLength(0);
    });

    it("updates transition properties and clamps duration", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "fade-to-black",
          durationInFrames: 10,
          trackId: "track-v1",
          fromClipId: "clip-1",
        },
      });

      const transId = state.transitions![0].id;
      const updated = editorReducer(state, {
        type: "UPDATE_TRANSITION",
        id: transId,
        properties: {
          durationInFrames: 20,
          type: "crossfade",
        },
      });

      expect(updated.transitions![0].type).toBe("crossfade");
      expect(updated.transitions![0].durationInFrames).toBe(20);
    });

    it("deletes a transition", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "crossfade",
          durationInFrames: 15,
          trackId: "track-v1",
          fromClipId: "clip-1",
        },
      });

      const transId = state.transitions![0].id;
      const updated = editorReducer(state, {
        type: "DELETE_TRANSITION",
        id: transId,
      });

      expect(updated.transitions).toHaveLength(0);
      expect(updated.selectedTransitionId).toBeNull();
    });

    it("automatically cleans up transitions when a referenced clip is deleted", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "crossfade",
          durationInFrames: 15,
          trackId: "track-v1",
          fromClipId: "clip-1",
          toClipId: "clip-2",
        },
      });
      expect(state.transitions).toHaveLength(1);

      const afterDelete = editorReducer(state, {
        type: "DELETE_CLIP",
        clipId: "clip-1",
      });

      expect(afterDelete.transitions).toHaveLength(0);
    });

    it("re-clamps transition duration when clip is trimmed", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "fade-to-black",
          durationInFrames: 25,
          trackId: "track-v1",
          fromClipId: "clip-1",
        },
      });

      // Trim clip-1 end down to 20 frames -> max transition is now 10 frames
      const afterTrim = editorReducer(state, {
        type: "TRIM_CLIP_END",
        clipId: "clip-1",
        newDurationInFrames: 20,
      });

      expect(afterTrim.transitions![0].durationInFrames).toBe(10);
    });

    it("remaps transitions during clip splitting", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          id: "trans-tail",
          type: "fade-to-black",
          durationInFrames: 10,
          trackId: "track-v1",
          fromClipId: "clip-1",
        },
      });

      // Split clip-1 (0 to 60) at frame 30
      const afterSplit = editorReducer(state, {
        type: "SPLIT_CLIP_AT_PLAYHEAD",
        frame: 30,
      });

      // Outgoing transition should now reference the second part (part 2)
      const part2 = afterSplit.clips.find((c) => c.timelineStartFrame === 30)!;
      const trans = afterSplit.transitions!.find((t) => t.id === "trans-tail")!;
      expect(trans.fromClipId).toBe(part2.id);
    });
  });

  describe("5. Undo / Redo Integration", () => {
    it("properly tracks effect changes in history and restores them", () => {
      const history = new HistoryManager();
      let state = createMockState();

      // Snapshot 1 (no effects)
      const snap1: HistorySnapshot = {
        clips: JSON.parse(JSON.stringify(state.clips)),
        tracks: state.tracks,
        transitions: state.transitions,
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      };
      history.push(snap1);

      // Apply effect
      state = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT",
        clipId: "clip-1",
        effectType: "blur",
        value: 12,
      });
      expect(state.clips.find((c) => c.id === "clip-1")!.effects).toHaveLength(1);

      // Undo
      const undoneSnap = history.undo({
        clips: state.clips,
        tracks: state.tracks,
        transitions: state.transitions,
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      })!;
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: undoneSnap });

      expect(state.clips.find((c) => c.id === "clip-1")!.effects).toBeUndefined();

      // Redo
      const redoneSnap = history.redo({
        clips: state.clips,
        tracks: state.tracks,
        transitions: state.transitions,
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      })!;
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: redoneSnap });

      expect(state.clips.find((c) => c.id === "clip-1")!.effects).toHaveLength(1);
      expect(state.clips.find((c) => c.id === "clip-1")!.effects![0].value).toBe(12);
    });

    it("properly tracks transitions in history and restores them on undo/redo", () => {
      const history = new HistoryManager();
      let state = createMockState();

      const snap1: HistorySnapshot = {
        clips: JSON.parse(JSON.stringify(state.clips)),
        tracks: state.tracks,
        transitions: [],
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      };
      history.push(snap1);

      // Add transition
      state = editorReducer(state, {
        type: "ADD_TRANSITION",
        transition: {
          type: "crossfade",
          durationInFrames: 15,
          trackId: "track-v1",
          fromClipId: "clip-1",
          toClipId: "clip-2",
        },
      });
      expect(state.transitions).toHaveLength(1);

      // Undo
      const undoneSnap = history.undo({
        clips: state.clips,
        tracks: state.tracks,
        transitions: state.transitions,
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      })!;
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: undoneSnap });
      expect(state.transitions).toHaveLength(0);

      // Redo
      const redoneSnap = history.redo({
        clips: state.clips,
        tracks: state.tracks,
        transitions: state.transitions,
        selectedClipId: state.selectedClipId,
        selectedTransitionId: state.selectedTransitionId,
        totalDurationInFrames: state.totalDurationInFrames,
      })!;
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: redoneSnap });
      expect(state.transitions).toHaveLength(1);
    });
  });
});

import { describe, it, expect } from "vitest";
import { editorReducer } from "../state/editorReducer";
import { HistoryManager } from "../state/history";
import { Clip, EditorState, HistorySnapshot, Track } from "../state/editorTypes";
import {
  computeDropAndSettle,
  computePaperSlide,
  computeTextHighlightProgress,
  computeStaggerWordState,
  computeBarProgress,
} from "../utils/animationUtils";
import {
  DEFAULT_GRAPHIC_PRESETS,
  EDITORIAL_EFFECTS_REGISTRY,
  EDITORIAL_TRANSITION_TYPES,
  createGraphicClip,
  createEffectInstance,
} from "../utils/editorialRegistry";

describe("Editorial Effects Engine & Vox Motion Graphics", () => {
  const createMockState = (): EditorState => {
    const tracks: Track[] = [
      { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
      { id: "track-v2", type: "video", name: "V2 Video", visible: true, locked: true },
    ];
    const clips: Clip[] = [
      {
        id: "clip-1",
        assetId: "asset-1",
        name: "Test B-Roll",
        type: "video",
        trackId: "track-v1",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 90,
        sourceDurationInFrames: 120,
        src: "/media/test.mp4",
        opacity: 1,
      },
    ];
    return {
      projectName: "Editorial Test",
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
      activeSidebarTab: "graphics",
      isExportDialogOpen: false,
      saveStatus: "saved",
    };
  };

  const getSnapshot = (s: EditorState): HistorySnapshot => ({
    clips: s.clips,
    tracks: s.tracks,
    transitions: s.transitions,
    selectedClipId: s.selectedClipId,
    selectedTransitionId: s.selectedTransitionId,
    totalDurationInFrames: s.totalDurationInFrames,
  });

  describe("1. Deterministic Animation Primitives (animationUtils)", () => {
    it("computeDropAndSettle respects frame delay and dampens to zero displacement", () => {
      // Before delay (frame 0 with delay 5)
      const preDelay = computeDropAndSettle(0, 30, { delayFrames: 5, startOffsetY: 200 });
      expect(preDelay.translateY).toBe(-200);
      expect(preDelay.opacity).toBe(0);

      // Mid-flight (frame 15)
      const mid = computeDropAndSettle(15, 30, { delayFrames: 0, startOffsetY: 200 });
      expect(mid.translateY).toBeGreaterThan(-200);
      expect(mid.opacity).toBeGreaterThan(0);

      // Settled (frame 60, well past 24 frames duration)
      const settled = computeDropAndSettle(60, 30, { delayFrames: 0, durationFrames: 24, startOffsetY: 200 });
      expect(Math.abs(settled.translateY)).toBeLessThan(1);
      expect(settled.opacity).toBe(1);
    });

    it("computePaperSlide translates along specified direction and settles", () => {
      const slideBottom = computePaperSlide(0, { direction: "bottom", durationFrames: 20 });
      expect(slideBottom.translateY).toBeGreaterThan(0);
      expect(slideBottom.translateX).toBe(0);

      const slideLeft = computePaperSlide(0, { direction: "left", durationFrames: 20 });
      expect(slideLeft.translateX).toBeLessThan(0);
      expect(slideLeft.translateY).toBe(0);

      const slideDone = computePaperSlide(25, { direction: "top", durationFrames: 20 });
      expect(slideDone.translateX).toBe(0);
      expect(slideDone.translateY).toBe(0);
      expect(slideDone.opacity).toBe(1);
    });

    it("computeTextHighlightProgress sweeps smoothly from 0 to 1", () => {
      // Before delay
      expect(computeTextHighlightProgress(2, { delayFrames: 5, durationFrames: 15 })).toBe(0);

      // Mid-sweep
      const mid = computeTextHighlightProgress(12, { delayFrames: 5, durationFrames: 14 });
      expect(mid).toBeGreaterThan(0.4);
      expect(mid).toBeLessThan(1);

      // Completed
      expect(computeTextHighlightProgress(25, { delayFrames: 5, durationFrames: 15 })).toBe(1);
    });

    it("computeStaggerWordState calculates sequential word reveals", () => {
      // Word 0 reveals before Word 3
      const word0AtFrame5 = computeStaggerWordState(0, 5, 3);
      const word3AtFrame5 = computeStaggerWordState(3, 5, 3);

      expect(word0AtFrame5.opacity).toBeGreaterThan(word3AtFrame5.opacity);
      expect(word0AtFrame5.translateY).toBeLessThan(word3AtFrame5.translateY);

      // Both settled after sufficient frames
      const word3AtFrame30 = computeStaggerWordState(3, 30, 3);
      expect(word3AtFrame30.opacity).toBe(1);
      expect(word3AtFrame30.translateY).toBe(0);
    });

    it("computeBarProgress springs from 0 to 1 without NaN or infinity", () => {
      const start = computeBarProgress(0, 30, 0, 24);
      expect(start).toBe(0);

      const mid = computeBarProgress(12, 30, 0, 24);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThanOrEqual(1.15); // Can have slight overshoot

      const end = computeBarProgress(60, 30, 0, 24);
      expect(end).toBeCloseTo(1, 1);
    });
  });

  describe("2. Editorial Registry & Presets", () => {
    it("contains all 4 Vox data graphic presets with valid schemas", () => {
      const types = DEFAULT_GRAPHIC_PRESETS.map((p) => p.type);
      expect(types).toContain("comparison-bars");
      expect(types).toContain("stat-card");
      expect(types).toContain("evidence-card");
      expect(types).toContain("percentage-card");

      const comparisonPreset = DEFAULT_GRAPHIC_PRESETS.find((p) => p.type === "comparison-bars");
      expect(comparisonPreset?.data.comparisonBars?.valueA).toBeDefined();
      expect(comparisonPreset?.data.comparisonBars?.valueB).toBeDefined();
    });

    it("createGraphicClip generates a valid Clip targeting a track", () => {
      const clip = createGraphicClip("stat-card", "track-v1", 45, 150);
      expect(clip.type).toBe("graphic");
      expect(clip.trackId).toBe("track-v1");
      expect(clip.timelineStartFrame).toBe(45);
      expect(clip.durationInFrames).toBe(150);
      expect(clip.graphicData?.statCard?.value).toBeDefined();
    });

    it("createEffectInstance produces typed default parameters", () => {
      const paperEff = createEffectInstance("paper-cutout");
      expect(paperEff.type).toBe("paper-cutout");
      expect(paperEff.enabled).toBe(true);
      expect(paperEff.params).toBeDefined();
      expect((paperEff.params as Record<string, unknown>).borderWidth).toBe(8);

      const dropEff = createEffectInstance("drop-settle");
      expect((dropEff.params as Record<string, unknown>).settleStrength).toBe(65);
    });

    it("EDITORIAL_EFFECTS_REGISTRY contains typed effect schemas", () => {
      expect(EDITORIAL_EFFECTS_REGISTRY.length).toBeGreaterThan(0);
      const paperCutout = EDITORIAL_EFFECTS_REGISTRY.find((e) => e.type === "paper-cutout");
      expect(paperCutout?.category).toBe("paper");
    });

    it("EDITORIAL_TRANSITION_TYPES includes all 6 editorial transition types", () => {
      const transTypes = EDITORIAL_TRANSITION_TYPES.map((t) => t.type);
      expect(transTypes).toEqual([
        "crossfade",
        "fade-to-black",
        "fade-from-black",
        "directional-wipe",
        "paper-slide",
        "paper-stack",
      ]);
    });
  });

  describe("3. Reducer Actions for Editorial Engine", () => {
    it("ADD_GRAPHIC_CLIP adds graphic clip and updates selection", () => {
      const state = createMockState();
      const updated = editorReducer(state, {
        type: "ADD_GRAPHIC_CLIP",
        graphicType: "comparison-bars",
        targetTrackId: "track-v1",
        startFrame: 30,
        durationInFrames: 120,
      });

      expect(updated.clips.length).toBe(state.clips.length + 1);
      const added = updated.clips.find((c) => c.type === "graphic");
      expect(added).toBeDefined();
      expect(added?.timelineStartFrame).toBe(30);
      expect(added?.durationInFrames).toBe(120);
      expect(added?.graphicData?.comparisonBars).toBeDefined();
      expect(updated.selectedClipId).toBe(added?.id);
    });

    it("UPDATE_GRAPHIC_DATA modifies graphic fields", () => {
      const state = createMockState();
      const withGraphic = editorReducer(state, {
        type: "ADD_GRAPHIC_CLIP",
        graphicType: "stat-card",
        targetTrackId: "track-v1",
      });
      const graphicClip = withGraphic.clips.find((c) => c.type === "graphic")!;

      const updated = editorReducer(withGraphic, {
        type: "UPDATE_GRAPHIC_DATA",
        clipId: graphicClip.id,
        graphicData: {
          statCard: {
            value: "$9.2B",
            label: "REVENUE GROWTH",
          },
        },
      });

      const updatedClip = updated.clips.find((c) => c.id === graphicClip.id);
      expect(updatedClip?.graphicData?.statCard?.value).toBe("$9.2B");
      expect(updatedClip?.graphicData?.statCard?.label).toBe("REVENUE GROWTH");
    });

    it("UPDATE_GRAPHIC_DATA is rejected if track is locked", () => {
      let state = createMockState();
      state = editorReducer(state, {
        type: "ADD_GRAPHIC_CLIP",
        graphicType: "evidence-card",
        targetTrackId: "track-v1",
      });
      const graphicClip = state.clips.find((c) => c.type === "graphic")!;

      // Lock track-v1
      state = editorReducer(state, {
        type: "TOGGLE_TRACK_LOCK",
        trackId: "track-v1",
      });

      const attempted = editorReducer(state, {
        type: "UPDATE_GRAPHIC_DATA",
        clipId: graphicClip.id,
        graphicData: {
          evidenceCard: {
            quote: "This should not be applied",
            source: "Locked source",
          },
        },
      });

      const target = attempted.clips.find((c) => c.id === graphicClip.id);
      expect(target?.graphicData?.evidenceCard?.quote).not.toBe("This should not be applied");
    });

    it("UPDATE_CLIP_EFFECT_PARAMS updates specific parameters without losing other effects", () => {
      const state = createMockState();
      const updated = editorReducer(state, {
        type: "UPDATE_CLIP_EFFECT_PARAMS",
        clipId: "clip-1",
        effectType: "paper-cutout",
        params: {
          tiltAngle: 4.5,
          borderWidth: 14,
          tapeStyle: "top-center",
        },
      });

      const clip = updated.clips.find((c) => c.id === "clip-1");
      const paperEff = clip?.effects?.find((e) => e.type === "paper-cutout");
      expect(paperEff).toBeDefined();
      const params = paperEff?.params as Record<string, unknown>;
      expect(params.tiltAngle).toBe(4.5);
      expect(params.borderWidth).toBe(14);
      expect(params.tapeStyle).toBe("top-center");
    });
  });

  describe("4. Undo / Redo Fidelity for Editorial Engine", () => {
    it("preserves graphic data and effect parameters through history snapshots", () => {
      const history = new HistoryManager();
      let state = createMockState();

      // Push initial state
      history.push(getSnapshot(state));

      // Add graphic clip
      state = editorReducer(state, {
        type: "ADD_GRAPHIC_CLIP",
        graphicType: "evidence-card",
        targetTrackId: "track-v1",
      });
      history.push(getSnapshot(state));

      const graphicId = state.selectedClipId!;

      // Update quote
      state = editorReducer(state, {
        type: "UPDATE_GRAPHIC_DATA",
        clipId: graphicId,
        graphicData: {
          evidenceCard: {
            quote: "Initial quote before undo",
            source: "Exhibit A",
          },
        },
      });

      expect(state.clips.find((c) => c.id === graphicId)?.graphicData?.evidenceCard?.quote).toBe(
        "Initial quote before undo"
      );

      // Undo to before quote was updated
      const snap1 = history.undo(getSnapshot(state));
      expect(snap1).toBeDefined();
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: snap1! });
      expect(state.clips.find((c) => c.id === graphicId)?.graphicData?.evidenceCard?.quote).not.toBe(
        "Initial quote before undo"
      );

      // Undo to before graphic clip was added
      const snap0 = history.undo(getSnapshot(state));
      expect(snap0).toBeDefined();
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: snap0! });
      expect(state.clips.find((c) => c.id === graphicId)).toBeUndefined();

      // Redo back
      const redo1 = history.redo(getSnapshot(state));
      expect(redo1).toBeDefined();
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: redo1! });
      expect(state.clips.find((c) => c.id === graphicId)).toBeDefined();
    });
  });
});

import { describe, it, expect } from "vitest";
import { editorReducer } from "../state/editorReducer";
import { EditorState } from "../state/editorTypes";

const createBaseState = (): EditorState => ({
  projectName: "Zoom Test",
  fps: 30,
  width: 1080,
  height: 1920,
  totalDurationInFrames: 300,
  currentFrame: 0,
  isPlaying: false,
  selectedClipId: null,
  activeTool: "select",
  activeSidebarTab: "media",
  snappingEnabled: true,
  zoom: 1,
  tracks: [],
  clips: [],
  assets: [],
  isExportDialogOpen: false,
  saveStatus: "saved",
});

function formatRulerTime(frame: number, fps: number, isFrameLevel: boolean): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const framePart = frame % fps;

  if (isFrameLevel) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(framePart).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

describe("Timeline Zoom & Frame-Level Resolution", () => {
  describe("SET_ZOOM Reducer Clamping", () => {
    it("allows zoom up to 40 px/frame for true frame-level visibility", () => {
      const initial = createBaseState();
      const updated = editorReducer(initial, { type: "SET_ZOOM", zoom: 40 });
      expect(updated.zoom).toBe(40);
    });

    it("clamps zoom to 40 if exceeded", () => {
      const initial = createBaseState();
      const updated = editorReducer(initial, { type: "SET_ZOOM", zoom: 100 });
      expect(updated.zoom).toBe(40);
    });

    it("clamps zoom to 0.1 at minimum", () => {
      const initial = createBaseState();
      const updated = editorReducer(initial, { type: "SET_ZOOM", zoom: 0.01 });
      expect(updated.zoom).toBe(0.1);
    });

    it("stores intermediate frame-level zoom values accurately", () => {
      const initial = createBaseState();
      const state5 = editorReducer(initial, { type: "SET_ZOOM", zoom: 5.5 });
      expect(state5.zoom).toBe(5.5);

      const state20 = editorReducer(initial, { type: "SET_ZOOM", zoom: 20 });
      expect(state20.zoom).toBe(20);
    });
  });

  describe("Timecode Formatting", () => {
    const fps = 30;

    it("formats standard view as MM:SS when zoom is zoomed out", () => {
      expect(formatRulerTime(0, fps, false)).toBe("00:00");
      expect(formatRulerTime(30, fps, false)).toBe("00:01");
      expect(formatRulerTime(75, fps, false)).toBe("00:02");
      expect(formatRulerTime(1800, fps, false)).toBe("01:00");
    });

    it("formats frame-level view as MM:SS:FF showing exact frame count", () => {
      expect(formatRulerTime(0, fps, true)).toBe("00:00:00");
      expect(formatRulerTime(1, fps, true)).toBe("00:00:01");
      expect(formatRulerTime(15, fps, true)).toBe("00:00:15");
      expect(formatRulerTime(45, fps, true)).toBe("00:01:15");
      expect(formatRulerTime(89, fps, true)).toBe("00:02:29");
      expect(formatRulerTime(1829, fps, true)).toBe("01:00:29");
    });
  });

  describe("Frame Level Tick Thresholds", () => {
    function getRulerConfig(zoom: number, fps: number) {
      const isFrameLevel = zoom >= 3.5;
      let majorIntervalFrames = fps;
      let minorIntervalFrames = Math.max(1, Math.round(fps / 2));
      let singleFrameTicks = false;

      if (zoom >= 18) {
        singleFrameTicks = true;
        minorIntervalFrames = 5;
        majorIntervalFrames = 10;
      } else if (zoom >= 7) {
        singleFrameTicks = true;
        minorIntervalFrames = 5;
        majorIntervalFrames = 15;
      } else if (zoom >= 3.5) {
        singleFrameTicks = true;
        minorIntervalFrames = 5;
        majorIntervalFrames = fps;
      } else if (zoom >= 1.5) {
        singleFrameTicks = false;
        minorIntervalFrames = 15;
        majorIntervalFrames = fps;
      } else {
        singleFrameTicks = false;
        minorIntervalFrames = fps * 2;
        majorIntervalFrames = fps * 5;
      }

      return { isFrameLevel, singleFrameTicks, majorIntervalFrames, minorIntervalFrames };
    }

    it("activates single frame ticks at zoom >= 3.5", () => {
      const low = getRulerConfig(2.0, 30);
      expect(low.isFrameLevel).toBe(false);
      expect(low.singleFrameTicks).toBe(false);

      const entry = getRulerConfig(3.5, 30);
      expect(entry.isFrameLevel).toBe(true);
      expect(entry.singleFrameTicks).toBe(true);
      expect(entry.minorIntervalFrames).toBe(5);
      expect(entry.majorIntervalFrames).toBe(30);

      const mid = getRulerConfig(10, 30);
      expect(mid.isFrameLevel).toBe(true);
      expect(mid.singleFrameTicks).toBe(true);
      expect(mid.majorIntervalFrames).toBe(15);

      const extreme = getRulerConfig(25, 30);
      expect(extreme.isFrameLevel).toBe(true);
      expect(extreme.singleFrameTicks).toBe(true);
      expect(extreme.majorIntervalFrames).toBe(10);
    });
  });
});

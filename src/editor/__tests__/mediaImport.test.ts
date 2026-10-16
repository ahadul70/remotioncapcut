import { describe, it, expect } from "vitest";

import {
  calculateFramesFromDuration,
  calculateDropFrame,
  createClipFromAsset,
  validateMediaFile,
} from "../utils/mediaUtils";
import { Clip, EditorState, MediaAsset } from "../state/editorTypes";
import { editorReducer } from "../state/editorReducer";
import { HistoryManager } from "../state/history";

describe("Metadata-to-frame duration conversion", () => {
  it("converts standard float seconds to integer frames at 30 fps", () => {
    expect(calculateFramesFromDuration(10, 30)).toBe(300);
    expect(calculateFramesFromDuration(2.5, 30)).toBe(75);
    expect(calculateFramesFromDuration(1.03333, 30)).toBe(31);
  });

  it("converts durations at different frame rates (60 fps, 24 fps)", () => {
    expect(calculateFramesFromDuration(1.0, 60)).toBe(60);
    expect(calculateFramesFromDuration(1.0, 24)).toBe(24);
  });

  it("guards against zero, negative, or invalid durations", () => {
    expect(calculateFramesFromDuration(0, 30)).toBe(1);
    expect(calculateFramesFromDuration(-5, 30)).toBe(1);
    expect(calculateFramesFromDuration(NaN, 30)).toBe(1);
    expect(calculateFramesFromDuration(Infinity, 30)).toBe(1);
  });
});

describe("Validation of media formats", () => {
  it("accepts valid video formats by MIME or extension", () => {
    expect(validateMediaFile({ name: "intro.mp4", type: "video/mp4" }).valid).toBe(true);
    expect(validateMediaFile({ name: "clip.webm", type: "video/webm" }).valid).toBe(true);
    expect(validateMediaFile({ name: "b-roll.mov", type: "" }).valid).toBe(true);
    expect(validateMediaFile({ name: "scene.mkv", type: "" }).valid).toBe(true);
    expect(validateMediaFile({ name: "intro.mp4", type: "video/mp4" }).mediaType).toBe("video");
  });

  it("accepts valid audio formats by MIME or extension", () => {
    expect(validateMediaFile({ name: "voice.mp3", type: "audio/mpeg" }).valid).toBe(true);
    expect(validateMediaFile({ name: "bgm.wav", type: "audio/wav" }).valid).toBe(true);
    expect(validateMediaFile({ name: "sfx.aac", type: "" }).valid).toBe(true);
    expect(validateMediaFile({ name: "track.flac", type: "" }).valid).toBe(true);
    expect(validateMediaFile({ name: "voice.mp3", type: "audio/mpeg" }).mediaType).toBe("audio");
  });

  it("rejects unsupported media formats with descriptive error", () => {
    const docRes = validateMediaFile({ name: "script.pdf", type: "application/pdf" });
    expect(docRes.valid).toBe(false);
    expect(docRes.error).toMatch(/Unsupported file type "script.pdf"/);

    const txtRes = validateMediaFile({ name: "notes.txt", type: "text/plain" });
    expect(txtRes.valid).toBe(false);

    const exeRes = validateMediaFile({ name: "installer.exe", type: "application/x-msdownload" });
    expect(exeRes.valid).toBe(false);
  });
});

describe("Drop-position calculation with zoom and scroll offset", () => {
  it("calculates frame at 1.0 zoom with zero scroll", () => {
    // clientX = 400, track lane starts at 100 -> offset = 300px -> 300 frames
    const frame = calculateDropFrame(400, 100, 0, 1.0);
    expect(frame).toBe(300);
  });

  it("incorporates horizontal scroll offset", () => {
    // clientX = 300, laneLeft = 100, scrollLeft = 200 -> offset = (300 - 100) + 200 = 400px -> 400 frames
    const frame = calculateDropFrame(300, 100, 200, 1.0);
    expect(frame).toBe(400);
  });

  it("accounts for zoom scaling (e.g. 0.8 and 2.0)", () => {
    // 160px offset at 0.8 zoom -> 160 / 0.8 = 200 frames
    expect(calculateDropFrame(260, 100, 0, 0.8)).toBe(200);

    // 200px offset at 2.0 zoom -> 200 / 2.0 = 100 frames
    expect(calculateDropFrame(300, 100, 0, 2.0)).toBe(100);
  });

  it("clamps negative positions to 0", () => {
    const frame = calculateDropFrame(50, 100, 0, 1.0);
    expect(frame).toBe(0);
  });

  it("clamps to total project duration when supplied", () => {
    const frame = calculateDropFrame(2000, 0, 0, 1.0, 500);
    expect(frame).toBe(500);
  });
});

describe("Creating clips from imported assets", () => {
  it("creates fully populated clip with valid integer-frame bounds", () => {
    const asset: MediaAsset = {
      id: "asset-sample-123",
      name: "SampleVideo.mp4",
      type: "video",
      src: "blob:http://localhost/sample-123",
      durationInSeconds: 5.5,
      durationInFrames: 165,
      width: 1920,
      height: 1080,
      fps: 30,
    };

    const clip = createClipFromAsset(asset, "track-v1", 90);

    expect(clip.id.startsWith("clip-")).toBe(true);
    expect(clip.assetId).toBe("asset-sample-123");
    expect(clip.name).toBe("SampleVideo.mp4");
    expect(clip.type).toBe("video");
    expect(clip.trackId).toBe("track-v1");
    expect(clip.timelineStartFrame).toBe(90);
    expect(clip.sourceStartFrame).toBe(0);
    expect(clip.durationInFrames).toBe(165);
    expect(clip.sourceDurationInFrames).toBe(165);
    expect(clip.src).toBe("blob:http://localhost/sample-123");
    expect(clip.volume).toBe(1);
    expect(clip.muted).toBe(false);
  });
});

describe("Undo and Redo media placement", () => {
  it("accurately rolls back and restores placed clips", () => {
    const history = new HistoryManager();

    const initialClips: Clip[] = [
      {
        id: "clip-initial",
        assetId: "asset-test",
        name: "TEST.mp4",
        type: "video",
        trackId: "track-v1",
        timelineStartFrame: 0,
        sourceStartFrame: 0,
        durationInFrames: 2289,
        sourceDurationInFrames: 2289,
        src: "test.mp4",
      },
    ];

    let state: EditorState = {
      projectName: "Test Project",
      fps: 30,
      width: 1080,
      height: 1920,
      totalDurationInFrames: 2319,
      currentFrame: 0,
      isPlaying: false,
      selectedClipId: "clip-initial",
      activeTool: "select",
      snappingEnabled: true,
      zoom: 1.0,
      tracks: [
        { id: "track-v1", type: "video", name: "V1" },
        { id: "track-a1", type: "audio", name: "A1" },
      ],
      clips: initialClips,
      assets: [],
      activeSidebarTab: "media",
      isExportDialogOpen: false,
      saveStatus: "saved",
    };

    // 1. Take initial snapshot before placement
    history.push({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });

    // 2. Place new imported clip
    const newAsset: MediaAsset = {
      id: "asset-imported-audio",
      name: "Voiceover.mp3",
      type: "audio",
      src: "blob:audio-url",
      durationInSeconds: 4,
      durationInFrames: 120,
      fps: 30,
    };

    const newClip = createClipFromAsset(newAsset, "track-a1", 60);

    state = {
      ...state,
      clips: [...state.clips, newClip],
      selectedClipId: newClip.id,
      totalDurationInFrames: Math.max(state.totalDurationInFrames, 60 + 120 + 30),
    };

    expect(state.clips.length).toBe(2);
    expect(state.selectedClipId).toBe(newClip.id);
    expect(history.canUndo()).toBe(true);

    // 3. Perform Undo
    const undoSnapshot = history.undo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });

    expect(undoSnapshot).toBeDefined();
    if (undoSnapshot) {
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: undoSnapshot });
    }

    expect(state.clips.length).toBe(1);
    expect(state.clips[0].id).toBe("clip-initial");
    expect(state.selectedClipId).toBe("clip-initial");
    expect(history.canRedo()).toBe(true);

    // 4. Perform Redo
    const redoSnapshot = history.redo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });

    expect(redoSnapshot).toBeDefined();
    if (redoSnapshot) {
      state = editorReducer(state, { type: "RESTORE_SNAPSHOT", snapshot: redoSnapshot });
    }

    expect(state.clips.length).toBe(2);
    expect(state.clips[1].id).toBe(newClip.id);
    expect(state.selectedClipId).toBe(newClip.id);
  });
});

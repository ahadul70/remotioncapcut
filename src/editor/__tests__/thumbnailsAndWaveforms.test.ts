import { describe, it, expect, beforeEach } from "vitest";

import {
  calculateThumbnailSlots,
  thumbnailCache,
} from "../utils/thumbnailCache";
import {
  extractPeaksFromChannelData,
  sliceWaveform,
  waveformCache,
} from "../utils/waveformCache";
import { Clip } from "../state/editorTypes";
import { editorReducer } from "../state/editorReducer";

describe("Video Thumbnail Slot & Source-Time Calculations", () => {
  it("generates a single thumbnail slot for very short clips", () => {
    // 30 frames at 0.8 zoom = 24px wide (less than 72px target width)
    const slots = calculateThumbnailSlots(0, 30, 0.8, 30, 72);
    expect(slots.length).toBe(1);
    expect(slots[0].index).toBe(0);
    expect(slots[0].sourceFrame).toBe(0);
    expect(slots[0].timestampSec).toBe(0);
    expect(slots[0].width).toBe(24);
  });

  it("tiles multiple evenly-spaced slots across longer clips", () => {
    // 300 frames at 1.0 zoom = 300px wide. With slot width 72, ceil(300 / 72) = 5 slots
    const slots = calculateThumbnailSlots(0, 300, 1.0, 30, 72);
    expect(slots.length).toBe(5);

    // Slot 0 starts at source frame 0
    expect(slots[0].sourceFrame).toBe(0);
    expect(slots[0].timestampSec).toBe(0);

    // Later slots progress forward in source time
    expect(slots[1].sourceFrame).toBeGreaterThan(0);
    expect(slots[2].sourceFrame).toBeGreaterThan(slots[1].sourceFrame);
    expect(slots[4].sourceFrame).toBeLessThanOrEqual(300);

    // All slots together cover the clip width
    const totalSlotWidth = slots.reduce((sum, s) => sum + s.width, 0);
    expect(totalSlotWidth).toBe(300);
  });

  it("accurately shifts source frame timestamps when left trimming", () => {
    // Original clip: sourceStartFrame = 0, duration = 300 frames (10 seconds)
    const originalSlots = calculateThumbnailSlots(0, 300, 1.0, 30, 72);

    // Left trimmed by 3 seconds (90 frames): sourceStartFrame = 90, duration = 210 frames
    const trimmedSlots = calculateThumbnailSlots(90, 210, 1.0, 30, 72);

    // First slot of trimmed clip must start at sourceFrame 90 (3.0 seconds into source)
    expect(trimmedSlots[0].sourceFrame).toBe(90);
    expect(trimmedSlots[0].timestampSec).toBe(3.0);

    // All trimmed slots must be offset by at least the trimmed amount compared to original
    expect(trimmedSlots[0].sourceFrame).toBeGreaterThanOrEqual(originalSlots[0].sourceFrame + 90);
  });

  it("adjusts slot count and boundaries when right trimming", () => {
    // Clip right-trimmed from 300 frames down to 100 frames
    const originalSlots = calculateThumbnailSlots(0, 300, 1.0, 30, 72);
    const rightTrimmedSlots = calculateThumbnailSlots(0, 100, 1.0, 30, 72);

    expect(rightTrimmedSlots.length).toBeLessThan(originalSlots.length);
    // All right-trimmed slots must not exceed sourceFrame 100
    for (const slot of rightTrimmedSlots) {
      expect(slot.sourceFrame).toBeLessThanOrEqual(100);
      expect(slot.timestampSec).toBeLessThanOrEqual(100 / 30);
    }
  });

  it("scales slot count proportionally with timeline zoom while preserving source alignment", () => {
    const duration = 200; // frames
    const slotsAt1x = calculateThumbnailSlots(0, duration, 1.0, 30, 72); // 200px -> 3 slots
    const slotsAt2x = calculateThumbnailSlots(0, duration, 2.0, 30, 72); // 400px -> 6 slots

    expect(slotsAt2x.length).toBeGreaterThan(slotsAt1x.length);

    // Both start at source frame 0
    expect(slotsAt1x[0].sourceFrame).toBe(0);
    expect(slotsAt2x[0].sourceFrame).toBe(0);
  });

  it("handles edge cases: zero duration or negative frames safely", () => {
    expect(calculateThumbnailSlots(0, 0, 1.0, 30, 72)).toEqual([]);
    expect(calculateThumbnailSlots(0, -50, 1.0, 30, 72)).toEqual([]);
    expect(calculateThumbnailSlots(0, 100, 0, 30, 72)).toEqual([]);
  });
});

describe("Thumbnail Cache Deduplication & Reuse", () => {
  beforeEach(() => {
    thumbnailCache.clear();
  });

  it("stores and retrieves cached thumbnail data URLs", () => {
    const fakeDataUrl = "data:image/jpeg;base64,sample-thumbnail-data";
    thumbnailCache.setCached("blob:test-video", 45, fakeDataUrl);

    const retrieved = thumbnailCache.getCached("blob:test-video", 45);
    expect(retrieved).toBe(fakeDataUrl);

    // Different frame returns undefined
    expect(thumbnailCache.getCached("blob:test-video", 90)).toBeUndefined();
    // Different source returns undefined
    expect(thumbnailCache.getCached("blob:other-video", 45)).toBeUndefined();
  });

  it("clears cached entries cleanly", () => {
    thumbnailCache.setCached("video1", 0, "thumb1");
    thumbnailCache.setCached("video2", 0, "thumb2");

    expect(thumbnailCache.getCached("video1", 0)).toBe("thumb1");
    thumbnailCache.clear();
    expect(thumbnailCache.getCached("video1", 0)).toBeUndefined();
    expect(thumbnailCache.getCached("video2", 0)).toBeUndefined();
  });

  it("gracefully returns null if browser video extraction fails in headless/test environment", async () => {
    // In node/vitest, document is simulated or video decoding doesn't exist
    const result = await thumbnailCache.getThumbnail("invalid-source", 10, 30);
    expect(result).toBeNull();
  });
});

describe("Audio Waveform Peak Downsampling & Normalization", () => {
  it("downsamples PCM channel data into normalized peak points between 0.0 and 1.0", () => {
    // Create 10,000 synthetic audio samples with varying amplitudes
    const sampleCount = 10000;
    const channelData = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      // Sine wave with amplitude modulation up to 0.8
      channelData[i] = Math.sin(i * 0.05) * 0.8 * (i / sampleCount);
    }

    const peaks = extractPeaksFromChannelData(channelData, 100);
    expect(peaks.length).toBe(100);

    // All normalized peaks must be within [0.0, 1.0]
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(0.0);
      expect(peak).toBeLessThanOrEqual(1.0);
    }

    // Peak near end should be higher than peak near beginning due to modulation
    expect(peaks[90]).toBeGreaterThan(peaks[10]);
  });

  it("handles completely silent audio without NaN or division by zero", () => {
    const silent = new Float32Array(4000); // all zeros
    const peaks = extractPeaksFromChannelData(silent, 50);

    expect(peaks.length).toBe(50);
    for (const peak of peaks) {
      expect(Number.isFinite(peak)).toBe(true);
      expect(peak).toBe(0);
    }
  });

  it("handles empty or zero-length audio buffers", () => {
    const empty = new Float32Array(0);
    expect(extractPeaksFromChannelData(empty, 50)).toEqual([]);
  });
});

describe("Waveform Trimming & Timeline Alignment", () => {
  it("returns full waveform slice for untrimmed clip", () => {
    const fullPeaks = [0.1, 0.3, 0.5, 0.8, 0.9, 0.7, 0.4, 0.2]; // 8 peaks
    const sliced = sliceWaveform(fullPeaks, 0, 100, 100);

    expect(sliced).toEqual(fullPeaks);
  });

  it("slices second half of waveform when left trimmed by 50%", () => {
    const fullPeaks = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]; // 8 peaks
    // Clip starts at frame 50 of 100, duration 50 frames
    const sliced = sliceWaveform(fullPeaks, 50, 50, 100);

    // Sliced should represent the second half [0.6, 0.7, 0.8, 0.9]
    expect(sliced.length).toBe(4);
    expect(sliced[0]).toBe(0.6);
    expect(sliced[sliced.length - 1]).toBe(0.9);
  });

  it("slices center segment when trimmed on both start and end", () => {
    const fullPeaks = [0.1, 0.2, 0.5, 0.9, 0.8, 0.4, 0.2, 0.1]; // 8 peaks
    // Clip starts at 25% (frame 25 of 100) and lasts 50% (50 frames)
    const sliced = sliceWaveform(fullPeaks, 25, 50, 100);

    // Sliced should represent the middle 4 peaks [0.5, 0.9, 0.8, 0.4]
    expect(sliced.length).toBe(4);
    expect(sliced).toEqual([0.5, 0.9, 0.8, 0.4]);
  });

  it("handles out-of-bounds or zero duration gracefully", () => {
    const peaks = [0.2, 0.4, 0.6];
    expect(sliceWaveform(peaks, 0, 0, 100)).toEqual([]);
    expect(sliceWaveform([], 10, 20, 100)).toEqual([]);
  });
});

describe("Waveform Cache Deduplication", () => {
  beforeEach(() => {
    waveformCache.clear();
  });

  it("stores and retrieves cached waveform peaks by source", () => {
    const peaks = [0.1, 0.5, 0.9, 0.3];
    waveformCache.setCached("audio-track-1.mp3", peaks);

    expect(waveformCache.getCached("audio-track-1.mp3")).toEqual(peaks);
    expect(waveformCache.getCached("other-track.mp3")).toBeUndefined();
  });

  it("clears waveform cache cleanly", () => {
    waveformCache.setCached("track.mp3", [0.4, 0.8]);
    waveformCache.clear();
    expect(waveformCache.getCached("track.mp3")).toBeUndefined();
  });
});

describe("Preserving Clip Movement and Editing with Thumbnails & Waveforms", () => {
  it("keeps sourceStartFrame intact when clip is moved horizontally on timeline", () => {
    const initialClip: Clip = {
      id: "clip-video",
      assetId: "asset-1",
      name: "Video Clip",
      type: "video",
      trackId: "track-v1",
      timelineStartFrame: 10,
      sourceStartFrame: 45, // Trimmed 45 frames into source
      durationInFrames: 90,
      sourceDurationInFrames: 300,
      src: "blob:test",
    };

    const state = {
      projectName: "Test",
      fps: 30,
      width: 1080,
      height: 1920,
      totalDurationInFrames: 500,
      currentFrame: 0,
      isPlaying: false,
      selectedClipId: "clip-video",
      activeTool: "select" as const,
      snappingEnabled: true,
      zoom: 1.0,
      tracks: [{ id: "track-v1", type: "video" as const, name: "V1" }],
      clips: [initialClip],
      assets: [],
      activeSidebarTab: "media" as const,
      isExportDialogOpen: false,
      saveStatus: "saved" as const,
    };

    // Move clip from timeline frame 10 to 60
    const moved = editorReducer(state, {
      type: "MOVE_CLIP",
      clipId: "clip-video",
      newStartFrame: 60,
    });

    const movedClip = moved.clips.find((c) => c.id === "clip-video")!;
    expect(movedClip.timelineStartFrame).toBe(60);
    // Source frame MUST NOT change during move: thumbnails remain identical!
    expect(movedClip.sourceStartFrame).toBe(45);
    expect(movedClip.durationInFrames).toBe(90);

    const slotsBefore = calculateThumbnailSlots(initialClip.sourceStartFrame, initialClip.durationInFrames, 1.0);
    const slotsAfter = calculateThumbnailSlots(movedClip.sourceStartFrame, movedClip.durationInFrames, 1.0);
    expect(slotsAfter).toEqual(slotsBefore);
  });

  it("splits a clip cleanly, producing continuous sequential thumbnail source frames", () => {
    const clipToSplit: Clip = {
      id: "clip-split-test",
      assetId: "asset-1",
      name: "Clip To Split",
      type: "video",
      trackId: "track-v1",
      timelineStartFrame: 0,
      sourceStartFrame: 0,
      durationInFrames: 120, // 4 seconds
      sourceDurationInFrames: 300,
      src: "blob:test",
    };

    const state = {
      projectName: "Test",
      fps: 30,
      width: 1080,
      height: 1920,
      totalDurationInFrames: 500,
      currentFrame: 60, // Split at 2 seconds
      isPlaying: false,
      selectedClipId: "clip-split-test",
      activeTool: "select" as const,
      snappingEnabled: true,
      zoom: 1.0,
      tracks: [{ id: "track-v1", type: "video" as const, name: "V1" }],
      clips: [clipToSplit],
      assets: [],
      activeSidebarTab: "media" as const,
      isExportDialogOpen: false,
      saveStatus: "saved" as const,
    };

    const afterSplit = editorReducer(state, {
      type: "SPLIT_CLIP_AT_PLAYHEAD",
      frame: 60,
    });

    expect(afterSplit.clips.length).toBe(2);
    const leftPart = afterSplit.clips[0];
    const rightPart = afterSplit.clips[1];

    // Left clip: frames 0 to 60, sourceStartFrame 0
    expect(leftPart.timelineStartFrame).toBe(0);
    expect(leftPart.durationInFrames).toBe(60);
    expect(leftPart.sourceStartFrame).toBe(0);

    // Right clip: starts at timeline 60, duration 60, sourceStartFrame 60
    expect(rightPart.timelineStartFrame).toBe(60);
    expect(rightPart.durationInFrames).toBe(60);
    expect(rightPart.sourceStartFrame).toBe(60);

    // Filmstrips for both parts must meet seamlessly at source frame 60
    const leftSlots = calculateThumbnailSlots(leftPart.sourceStartFrame, leftPart.durationInFrames, 1.0);
    const rightSlots = calculateThumbnailSlots(rightPart.sourceStartFrame, rightPart.durationInFrames, 1.0);

    expect(leftSlots[0].sourceFrame).toBe(0);
    expect(rightSlots[0].sourceFrame).toBe(60);
  });
});

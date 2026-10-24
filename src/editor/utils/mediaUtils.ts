import { random } from "remotion";
import { Clip, MediaAsset } from "../state/editorTypes";
import { thumbnailCache } from "./thumbnailCache";

export type MediaValidationResult = {
  valid: boolean;
  mediaType?: "video" | "audio";
  error?: string;
};

export type ExtractedMetadata = {
  durationInSeconds: number;
  durationInFrames: number;
  width?: number;
  height?: number;
  type: "video" | "audio";
  thumbnail?: string;
};

const SUPPORTED_VIDEO_EXTS = [".mp4", ".webm", ".mov", ".mkv", ".m4v"];
const SUPPORTED_AUDIO_EXTS = [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a"];

/**
 * Validates whether a file is an accepted video or audio format.
 */
export function validateMediaFile(file: { name: string; type?: string; size?: number }): MediaValidationResult {
  const name = file.name || "";
  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex !== -1 ? name.slice(dotIndex).toLowerCase() : "";
  const mime = (file.type || "").toLowerCase();

  const isVideo =
    mime.startsWith("video/") ||
    SUPPORTED_VIDEO_EXTS.includes(ext);

  const isAudio =
    mime.startsWith("audio/") ||
    SUPPORTED_AUDIO_EXTS.includes(ext);

  if (isVideo) {
    return { valid: true, mediaType: "video" };
  }

  if (isAudio) {
    return { valid: true, mediaType: "audio" };
  }

  return {
    valid: false,
    error: `Unsupported file type "${name}". Please import video (MP4, WebM, MOV) or audio (MP3, WAV, AAC).`,
  };
}

/**
 * Converts a floating-point seconds duration to project integer frames.
 */
export function calculateFramesFromDuration(durationInSeconds: number, fps: number): number {
  if (!isFinite(durationInSeconds) || durationInSeconds <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(durationInSeconds * fps));
}

/**
 * Calculates drop frame coordinate on a timeline track lane.
 */
export function calculateDropFrame(
  clientX: number,
  laneLeft: number,
  scrollLeft: number,
  zoom: number,
  totalDuration?: number
): number {
  const pixelOffset = clientX - laneLeft + scrollLeft;
  const rawFrame = Math.max(0, Math.round(pixelOffset / zoom));
  if (totalDuration !== undefined && totalDuration > 0) {
    return Math.min(rawFrame, totalDuration);
  }
  return rawFrame;
}

/**
 * Creates a unique, fully populated Clip object from an imported MediaAsset.
 */
export function createClipFromAsset(
  asset: MediaAsset,
  targetTrackId: string,
  timelineStartFrame: number
): Clip {
  const rand = random(null).toString(36).substring(2, 7);
  const clipId = `clip-${Date.now().toString(36)}-${rand}`;

  return {
    id: clipId,
    assetId: asset.id,
    name: asset.name,
    type: asset.type,
    trackId: targetTrackId,
    timelineStartFrame: Math.max(0, Math.round(timelineStartFrame)),
    sourceStartFrame: 0,
    durationInFrames: asset.durationInFrames,
    sourceDurationInFrames: asset.durationInFrames,
    src: asset.src,
    positionX: 0,
    positionY: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    volume: 1,
    muted: false,
  };
}

/**
 * Generates an image thumbnail for a video blob URL via HTML5 Canvas.
 */
export function captureVideoThumbnail(videoSrc: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.document) {
      resolve(undefined);
      return;
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let resolved = false;
    const cleanup = () => {
      resolved = true;
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      video.src = "";
    };

    const captureCanvas = () => {
      try {
        const aspect = (video.videoWidth || 16) / (video.videoHeight || 9);
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = Math.round(160 / aspect) || 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch {
        // Fall back gracefully
      }
      cleanup();
      resolve(undefined);
    };

    const onSeeked = () => {
      captureCanvas();
    };

    const onLoadedData = () => {
      try {
        if (video.duration > 0.2) {
          video.currentTime = 0.1;
        } else {
          captureCanvas();
        }
      } catch {
        captureCanvas();
      }
    };

    const onError = () => {
      cleanup();
      resolve(undefined);
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    video.src = videoSrc;
    try {
      video.load();
    } catch {
      // Ignore
    }

    // Short timeout safeguard (800ms)
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(undefined);
      }
    }, 800);
  });
}

/**
 * Extracts duration, resolution, type, and thumbnail from a browser File.
 */
export async function extractMediaMetadata(file: File, fps: number): Promise<ExtractedMetadata> {
  const validation = validateMediaFile(file);
  if (!validation.valid || !validation.mediaType) {
    throw new Error(validation.error || `Unsupported media format: ${file.name}`);
  }

  const mediaType = validation.mediaType;
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const isVideo = mediaType === "video";
    const mediaEl = isVideo ? document.createElement("video") : document.createElement("audio");
    mediaEl.preload = "auto";
    mediaEl.muted = true;

    let settled = false;

    const finalize = async (durationSec: number, width?: number, height?: number) => {
      if (settled) return;
      settled = true;

      const durationInSeconds = Math.max(0.1, isFinite(durationSec) && durationSec > 0 ? durationSec : 10);
      const durationInFrames = calculateFramesFromDuration(durationInSeconds, fps);

      let thumbnail: string | undefined;
      if (isVideo) {
        try {
          thumbnail = await captureVideoThumbnail(objectUrl);
          if (thumbnail) {
            thumbnailCache.setCached(objectUrl, 0, thumbnail);
          }
        } catch {
          thumbnail = undefined;
        }
      }

      URL.revokeObjectURL(objectUrl);
      resolve({
        durationInSeconds,
        durationInFrames,
        width,
        height,
        type: mediaType,
        thumbnail,
      });
    };

    const tryMediabunnyFallback = async () => {
      try {
        const { Input, ALL_FORMATS, BlobSource } = await import("mediabunny");
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        });
        const computedSec = await input.computeDuration();
        input.dispose();
        finalize(computedSec);
      } catch {
        finalize(10); // Safe fallback: default 10 seconds duration
      }
    };

    mediaEl.onloadedmetadata = () => {
      const durationSec = mediaEl.duration;
      if (isFinite(durationSec) && durationSec > 0) {
        const videoEl = isVideo ? (mediaEl as HTMLVideoElement) : null;
        finalize(durationSec, videoEl?.videoWidth, videoEl?.videoHeight);
      } else {
        tryMediabunnyFallback();
      }
    };

    mediaEl.onerror = () => {
      tryMediabunnyFallback();
    };

    mediaEl.src = objectUrl;
    try {
      mediaEl.load();
    } catch {
      tryMediabunnyFallback();
    }

    // 2-second timeout safeguard for metadata parsing
    setTimeout(() => {
      if (!settled) {
        tryMediabunnyFallback();
      }
    }, 2000);
  });
}

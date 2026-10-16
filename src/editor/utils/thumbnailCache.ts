/**
 * Real Video Thumbnail Extraction & Caching Utility
 * Extracts and caches genuine video frames at specified source timestamps
 * using HTML5 Video and Canvas.
 */

export interface ThumbnailSlot {
  index: number;
  pixelLeft: number;
  width: number;
  sourceFrame: number;
  timestampSec: number;
  cacheKey: string;
}

/**
 * Pure function: calculates the exact source frames and pixel slots for a filmstrip.
 * Accurately accounts for trimming (sourceStartFrame), duration, and timeline zoom.
 */
export function calculateThumbnailSlots(
  sourceStartFrame: number,
  durationInFrames: number,
  zoom: number,
  fps = 30,
  targetSlotWidth = 72
): ThumbnailSlot[] {
  if (durationInFrames <= 0 || zoom <= 0) {
    return [];
  }

  const totalWidthPx = Math.max(16, durationInFrames * zoom);
  // For short clips, at least 1 slot; for longer clips, tile evenly
  const slotCount = Math.max(1, Math.ceil(totalWidthPx / targetSlotWidth));
  const slots: ThumbnailSlot[] = [];

  for (let i = 0; i < slotCount; i++) {
    const pixelLeft = i * targetSlotWidth;
    const width = Math.min(targetSlotWidth, totalWidthPx - pixelLeft);
    if (width <= 0) break;

    // Fractional progress along the visible timeline clip
    const progress = slotCount === 1 ? 0 : i / slotCount;
    const frameOffset = Math.round(progress * durationInFrames);
    const sourceFrame = Math.max(0, sourceStartFrame + frameOffset);
    const timestampSec = +(sourceFrame / fps).toFixed(3);

    slots.push({
      index: i,
      pixelLeft,
      width,
      sourceFrame,
      timestampSec,
      cacheKey: `f_${sourceFrame}`,
    });
  }

  return slots;
}

class ThumbnailCacheService {
  private cache = new Map<string, string>();
  private inFlight = new Map<string, Promise<string | null>>();
  private maxCacheSize = 250;
  private videoPool = new Map<string, HTMLVideoElement>();

  /**
   * Generates a unique cache key for a specific media source and source frame.
   */
  public getCacheKey(src: string, sourceFrame: number): string {
    return `${src}#f${sourceFrame}`;
  }

  /**
   * Checks if a thumbnail is already cached synchronously.
   */
  public getCached(src: string, sourceFrame: number): string | undefined {
    return this.cache.get(this.getCacheKey(src, sourceFrame));
  }

  /**
   * Manually store a thumbnail in the cache (useful for tests or pre-cached poster frames).
   */
  public setCached(src: string, sourceFrame: number, dataUrl: string): void {
    const key = this.getCacheKey(src, sourceFrame);
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, dataUrl);
  }

  /**
   * Clear all cached thumbnails and release pooled video elements.
   */
  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.videoPool.forEach((video) => {
      video.pause();
      video.src = "";
      video.load();
    });
    this.videoPool.clear();
  }

  /**
   * Requests extraction of a thumbnail at a given source frame.
   * Reuses cached results or in-flight promises.
   */
  public async getThumbnail(
    src: string,
    sourceFrame: number,
    fps = 30
  ): Promise<string | null> {
    const key = this.getCacheKey(src, sourceFrame);

    // 1. Return from cache if already extracted
    const existing = this.cache.get(key);
    if (existing) {
      return existing;
    }

    // 2. Return in-flight extraction promise to avoid duplicate work
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    // 3. Extract frame asynchronously
    const timestampSec = +(sourceFrame / fps).toFixed(3);
    const extractionPromise = this.extractFrame(src, timestampSec)
      .then((dataUrl) => {
        if (dataUrl) {
          this.setCached(src, sourceFrame, dataUrl);
        }
        return dataUrl;
      })
      .catch((err) => {
        console.warn(`[ThumbnailCache] Failed to extract frame at ${timestampSec}s:`, err);
        return null;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, extractionPromise);
    return extractionPromise;
  }

  private getOrCreateVideo(src: string): HTMLVideoElement | null {
    if (typeof window === "undefined" || !window.document) {
      return null;
    }

    let video = this.videoPool.get(src);
    if (!video) {
      video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = src;
      try {
        video.load();
      } catch {
        // Ignore load error
      }
      this.videoPool.set(src, video);
    }
    return video;
  }

  private extractFrame(src: string, timestampSec: number): Promise<string | null> {
    return new Promise((resolve) => {
      const video = this.getOrCreateVideo(src);
      if (!video) {
        resolve(null);
        return;
      }

      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 1200);

      const cleanup = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        clearTimeout(timeoutId);
      };

      const onSeeked = () => {
        try {
          const width = 96;
          const aspect = (video.videoWidth || 16) / (video.videoHeight || 9);
          const height = Math.round(width / aspect) || 54;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch (err) {
          console.warn("[ThumbnailCache] Canvas draw failed:", err);
        }
        cleanup();
        resolve(null);
      };

      const onError = () => {
        cleanup();
        resolve(null);
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });


      try {
        // Clamp seek time within safe video bounds
        const targetTime = Math.max(0, timestampSec);
        video.currentTime = targetTime;
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }
}

export const thumbnailCache = new ThumbnailCacheService();

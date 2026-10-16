/**
 * Real Audio Waveform Extraction & Caching Utility
 * Decodes genuine PCM audio data from audio or video assets via Web Audio API,
 * downsamples into normalized peaks, and slices based on clip trim points.
 */

/**
 * Pure function: downsamples raw PCM channel data into normalized peak values (0.0 to 1.0).
 */
export function extractPeaksFromChannelData(
  channelData: Float32Array,
  targetPoints = 800
): number[] {
  const totalSamples = channelData.length;
  if (totalSamples === 0 || targetPoints <= 0) {
    return [];
  }

  const pointsCount = Math.min(targetPoints, totalSamples);
  const blockSize = Math.floor(totalSamples / pointsCount);
  const peaks: number[] = new Array(pointsCount);

  let maxGlobal = 0.0001; // Avoid divide-by-zero

  for (let i = 0; i < pointsCount; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let peak = 0;

    for (let j = start; j < end; j++) {
      const absVal = Math.abs(channelData[j]);
      if (absVal > peak) {
        peak = absVal;
      }
    }

    peaks[i] = peak;
    if (peak > maxGlobal) {
      maxGlobal = peak;
    }
  }

  // Normalize peaks so waveforms have good contrast (0.0 to 1.0)
  const normFactor = 1.0 / maxGlobal;
  for (let i = 0; i < pointsCount; i++) {
    peaks[i] = +(Math.min(1.0, peaks[i] * normFactor)).toFixed(3);
  }

  return peaks;
}

/**
 * Pure function: extracts the visible window of waveform peaks for a trimmed clip.
 * Accurately aligns waveform with sourceStartFrame, durationInFrames, and sourceDurationInFrames.
 */
export function sliceWaveform(
  peaks: number[],
  sourceStartFrame: number,
  durationInFrames: number,
  sourceDurationInFrames: number
): number[] {
  if (!peaks || peaks.length === 0 || durationInFrames <= 0) {
    return [];
  }

  const totalFrames = Math.max(1, sourceDurationInFrames || durationInFrames);
  const peaksCount = peaks.length;

  const startFrac = Math.max(0, Math.min(1, sourceStartFrame / totalFrames));
  const endFrac = Math.max(startFrac, Math.min(1, (sourceStartFrame + durationInFrames) / totalFrames));

  const startIdx = Math.floor(startFrac * peaksCount);
  const endIdx = Math.max(startIdx + 1, Math.ceil(endFrac * peaksCount));

  return peaks.slice(startIdx, Math.min(peaksCount, endIdx));
}

class WaveformCacheService {
  private cache = new Map<string, number[]>();
  private inFlight = new Map<string, Promise<number[] | null>>();
  private audioContext: AudioContext | null = null;

  public getCached(src: string): number[] | undefined {
    return this.cache.get(src);
  }

  public setCached(src: string, peaks: number[]): void {
    this.cache.set(src, peaks);
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioCtx();
    }
    return this.audioContext;
  }

  /**
   * Fetches media, decodes PCM audio data, downsamples to 800 peak points, and caches result.
   * Handles audio assets and video assets containing audio tracks.
   */
  public async getWaveform(src: string): Promise<number[] | null> {
    const existing = this.cache.get(src);
    if (existing) {
      return existing;
    }

    const pending = this.inFlight.get(src);
    if (pending) {
      return pending;
    }

    const extractionPromise = this.decodeAndExtract(src)
      .then((peaks) => {
        if (peaks && peaks.length > 0) {
          this.setCached(src, peaks);
        }
        return peaks;
      })
      .catch((err) => {
        console.warn(`[WaveformCache] Failed to decode audio from "${src}":`, err);
        return null;
      })
      .finally(() => {
        this.inFlight.delete(src);
      });

    this.inFlight.set(src, extractionPromise);
    return extractionPromise;
  }

  private async decodeAndExtract(src: string): Promise<number[] | null> {
    const ctx = this.getAudioContext();
    if (!ctx) {
      return null;
    }

    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} fetching audio source`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return null;
    }

    // decodeAudioData decodes mp3, wav, aac, and audio tracks from mp4/webm containers
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (!audioBuffer || audioBuffer.length === 0) {
      return null;
    }

    // Read primary channel (or mix first 2 channels if stereo)
    const channel0 = audioBuffer.getChannelData(0);
    const peaks = extractPeaksFromChannelData(channel0, 800);
    return peaks;
  }
}

export const waveformCache = new WaveformCacheService();

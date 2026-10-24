import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  Sequence,
  Video,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";
import { Clip, Track, ClipTransition } from "./editor/state/editorTypes";
import { buildCssFilter, getVignetteIntensity } from "./editor/utils/effectAndTransitionUtils";

export type VideoCompositionProps = {
  clips?: Clip[];
  tracks?: Track[];
  transitions?: ClipTransition[];
};

export const calculateMetadata: CalculateMetadataFunction<VideoCompositionProps> = async ({ props }) => {
  if (props?.clips && props.clips.length > 0) {
    const maxEnd = Math.max(...props.clips.map((c) => c.timelineStartFrame + c.durationInFrames));
    return {
      durationInFrames: Math.max(maxEnd, 60),
      props,
    };
  }

  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(staticFile("TEST.mp4")),
  });
  try {
    const durationInSeconds = await input.computeDuration();
    const durationInFrames = Math.max(Math.ceil(durationInSeconds * 30), 2289);
    return {
      durationInFrames,
      props: {
        clips: [
          {
            id: "clip-default-test",
            assetId: "asset-test-mp4",
            name: "TEST.mp4",
            type: "video",
            trackId: "track-v1",
            timelineStartFrame: 0,
            sourceStartFrame: 0,
            durationInFrames,
            sourceDurationInFrames: durationInFrames,
            src: staticFile("TEST.mp4"),
            positionX: 0,
            positionY: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            volume: 1,
          },
        ],
      },
    };
  } catch {
    return {
      durationInFrames: 2289,
      props: {
        clips: [
          {
            id: "clip-default-test",
            assetId: "asset-test-mp4",
            name: "TEST.mp4",
            type: "video",
            trackId: "track-v1",
            timelineStartFrame: 0,
            sourceStartFrame: 0,
            durationInFrames: 2289,
            sourceDurationInFrames: 2289,
            src: staticFile("TEST.mp4"),
            positionX: 0,
            positionY: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            volume: 1,
          },
        ],
      },
    };
  } finally {
    input.dispose();
  }
};

/**
 * Individual visual clip renderer with transitions and video effects applied deterministically.
 */
const VisualClipItem: React.FC<{
  clip: Clip;
  transitions: ClipTransition[];
}> = ({ clip, transitions }) => {
  const frame = useCurrentFrame();

  // Find incoming and outgoing transitions
  const transIn = transitions.find((t) => t.toClipId === clip.id);
  const transOut = transitions.find((t) => t.fromClipId === clip.id);

  let transitionOpacity = 1;
  let blackOverlayOpacity = 0;

  // Incoming transition (starts at frame 0)
  if (transIn && clip.durationInFrames > 1) {
    const durIn = Math.max(1, Math.min(transIn.durationInFrames, Math.floor(clip.durationInFrames / 2)));
    if (frame < durIn) {
      const progressIn = frame / durIn;
      if (transIn.type === "fade-from-black") {
        blackOverlayOpacity = Math.max(blackOverlayOpacity, 1 - progressIn);
        transitionOpacity *= progressIn;
      } else if (transIn.type === "crossfade") {
        transitionOpacity *= progressIn;
      }
    }
  }

  // Outgoing transition (ends at clip.durationInFrames)
  if (transOut && clip.durationInFrames > 1) {
    const durOut = Math.max(1, Math.min(transOut.durationInFrames, Math.floor(clip.durationInFrames / 2)));
    const startOut = clip.durationInFrames - durOut;
    if (frame >= startOut) {
      const progressOut = (frame - startOut) / durOut;
      if (transOut.type === "fade-to-black") {
        blackOverlayOpacity = Math.max(blackOverlayOpacity, progressOut);
        transitionOpacity *= 1 - progressOut;
      } else if (transOut.type === "crossfade") {
        transitionOpacity *= 1 - progressOut;
      }
    }
  }

  const baseOpacity = clip.opacity ?? 1;
  const effectiveOpacity = Math.max(0, Math.min(1, baseOpacity * transitionOpacity));
  const cssFilter = buildCssFilter(clip.effects);
  const vignetteIntensity = getVignetteIntensity(clip.effects);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: effectiveOpacity,
        transform: `translate(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px) scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`,
      }}
    >
      {clip.type === "video" && (
        <Video
          src={clip.src}
          startFrom={clip.sourceStartFrame}
          volume={clip.muted ? 0 : (clip.volume ?? 1)}
          pauseWhenBuffering={false}
          style={{
            width: "100%",
            height: "100%",
            // eslint-disable-next-line @remotion/no-object-fit-on-media-video
            objectFit: "contain",
            filter: cssFilter !== "none" ? cssFilter : undefined,
          }}
        />
      )}

      {clip.type === "image" && (
        <Img
          src={clip.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: cssFilter !== "none" ? cssFilter : undefined,
          }}
        />
      )}

      {clip.type === "text" && (
        <div
          style={{
            fontSize: clip.fontSize ?? 48,
            fontFamily: clip.fontFamily ?? "sans-serif",
            fontWeight: clip.fontWeight ?? "bold",
            fontStyle: clip.fontStyle ?? "normal",
            color: clip.color ?? "#ffffff",
            backgroundColor: clip.backgroundColor ?? "transparent",
            textAlign: clip.textAlign ?? "center",
            padding: "8px 16px",
            borderRadius: 4,
            maxWidth: "80%",
            wordBreak: "break-word",
            filter: cssFilter !== "none" ? cssFilter : undefined,
          }}
        >
          {clip.text || clip.name}
        </div>
      )}

      {/* Vignette effect overlay */}
      {vignetteIntensity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, ${(vignetteIntensity / 100) * 0.9}) 100%)`,
          }}
        />
      )}

      {/* Fade to/from black overlay */}
      {blackOverlayOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundColor: `rgba(0, 0, 0, ${blackOverlayOpacity})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/**
 * Clean Video Composition:
 * Contains ONLY video playback and elements intended for the final export.
 * Zero editor UI, buttons, or timeline controls are rendered here.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  clips = [],
  tracks = [],
  transitions = [],
}) => {
  // If no clips provided, render default TEST.mp4 sequence with full duration (2289 frames)
  const activeClips =
    clips.length > 0
      ? clips
      : [
          {
            id: "clip-default-test",
            assetId: "asset-test-mp4",
            name: "TEST.mp4",
            type: "video" as const,
            trackId: "track-v1",
            timelineStartFrame: 0,
            sourceStartFrame: 0,
            durationInFrames: 2289,
            sourceDurationInFrames: 2289,
            src: staticFile("TEST.mp4"),
          },
        ];

  // Track map for fast lookup of visibility and mute states
  const trackMap = new Map<string, Track>();
  tracks.forEach((t) => trackMap.set(t.id, t));

  // Determine track layer order: lower index = bottom layer, higher index = top layer (overlay)
  const visualTrackOrder = new Map<string, number>();
  tracks
    .filter((t) => t.type === "video")
    .forEach((t, idx) => visualTrackOrder.set(t.id, idx));

  // Filter visual clips (video, image, text): exclude clips belonging to hidden tracks
  const visibleVisualClips = activeClips
    .filter((clip) => {
      if (clip.type === "audio") return false;
      const track = trackMap.get(clip.trackId);
      return track ? track.visible !== false : true;
    })
    .sort((a, b) => {
      const orderA = visualTrackOrder.get(a.trackId) ?? 0;
      const orderB = visualTrackOrder.get(b.trackId) ?? 0;
      return orderA - orderB;
    });

  // Filter audio clips: exclude or mute if track is muted
  const activeAudioClips = activeClips.filter((clip) => clip.type === "audio");

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Visual Tracks Layered in Sequence Order */}
      {visibleVisualClips.map((clip) => {
        return (
          <Sequence
            key={clip.id}
            from={clip.timelineStartFrame}
            durationInFrames={clip.durationInFrames}
          >
            <VisualClipItem clip={clip} transitions={transitions} />
          </Sequence>
        );
      })}

      {/* Audio Tracks Mixed Simultaneously */}
      {activeAudioClips.map((clip) => {
        const track = trackMap.get(clip.trackId);
        const isTrackMuted = track ? track.muted === true : false;
        const effectiveVolume = isTrackMuted || clip.muted ? 0 : (clip.volume ?? 1);

        return (
          <Sequence
            key={clip.id}
            from={clip.timelineStartFrame}
            durationInFrames={clip.durationInFrames}
          >
            <Audio
              src={clip.src}
              startFrom={clip.sourceStartFrame}
              volume={effectiveVolume}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={VideoComposition}
      durationInFrames={2289}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={calculateMetadata}
    />
  );
};

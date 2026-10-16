import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  Sequence,
  Video,
  Audio,
  staticFile,
} from "remotion";
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";
import { Clip, Track } from "./editor/state/editorTypes";

export type VideoCompositionProps = {
  clips?: Clip[];
  tracks?: Track[];
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
 * Clean Video Composition:
 * Contains ONLY video playback and elements intended for the final export.
 * Zero editor UI, buttons, or timeline controls are rendered here.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  clips = [],
  tracks = [],
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
  const videoTrackOrder = new Map<string, number>();
  tracks
    .filter((t) => t.type === "video")
    .forEach((t, idx) => videoTrackOrder.set(t.id, idx));

  // Filter video clips: exclude clips belonging to hidden tracks (visible === false)
  // Sort by track order so higher tracks (e.g. V2) stack on top of lower tracks (V1)
  const visibleVideoClips = activeClips
    .filter((clip) => {
      if (clip.type !== "video") return false;
      const track = trackMap.get(clip.trackId);
      return track ? track.visible !== false : true;
    })
    .sort((a, b) => {
      const orderA = videoTrackOrder.get(a.trackId) ?? 0;
      const orderB = videoTrackOrder.get(b.trackId) ?? 0;
      return orderA - orderB;
    });

  // Filter audio clips: exclude or mute if track is muted
  const activeAudioClips = activeClips.filter((clip) => clip.type === "audio");

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* Video Tracks Layered in Sequence Order */}
      {visibleVideoClips.map((clip) => {
        return (
          <Sequence
            key={clip.id}
            from={clip.timelineStartFrame}
            durationInFrames={clip.durationInFrames}
          >
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                opacity: clip.opacity ?? 1,
                transform: `translate(${clip.positionX ?? 0}px, ${clip.positionY ?? 0}px) scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`,
              }}
            >
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
                }}
              />
            </AbsoluteFill>
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

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
import { Clip } from "./editor/state/editorTypes";

export type VideoCompositionProps = {
  clips?: Clip[];
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
export const VideoComposition: React.FC<VideoCompositionProps> = ({ clips = [] }) => {
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

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {activeClips
        .filter((c) => c.type === "video")
        .map((clip) => {
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

      {activeClips
        .filter((c) => c.type === "audio")
        .map((clip) => {
          return (
            <Sequence
              key={clip.id}
              from={clip.timelineStartFrame}
              durationInFrames={clip.durationInFrames}
            >
              <Audio
                src={clip.src}
                startFrom={clip.sourceStartFrame}
                volume={clip.muted ? 0 : (clip.volume ?? 1)}
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

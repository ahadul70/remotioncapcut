import React from "react";
import { useCurrentFrame } from "remotion";
import { Clip, ClipEffect, StaggerWordsParams, TextHighlightParams } from "../../state/editorTypes";
import { computeStaggerWordState, computeTextHighlightProgress } from "../../utils/animationUtils";

type EditorialTypographyProps = {
  clip: Clip;
  effects?: ClipEffect[];
  cssFilter?: string;
};

export const EditorialTypography: React.FC<EditorialTypographyProps> = ({
  clip,
  effects,
  cssFilter,
}) => {
  const frame = useCurrentFrame();

  const highlightEffect = effects?.find((e) => e.type === "text-highlight" && e.enabled);
  const staggerEffect = effects?.find((e) => e.type === "stagger-words" && e.enabled);

  const highlightParams = (highlightEffect?.params as TextHighlightParams) || {};
  const staggerParams = (staggerEffect?.params as StaggerWordsParams) || {};

  const textContent = clip.text || clip.name || "Editorial Headline";
  const words = textContent.split(" ");

  const highlightColor = highlightParams.highlightColor ?? "#fef08a"; // Highlighter yellow
  const highlightProgress = highlightEffect
    ? computeTextHighlightProgress(frame, highlightParams)
    : 0;

  const mode = highlightParams.mode ?? "sweep";

  return (
    <div
      style={{
        position: "relative",
        fontSize: clip.fontSize ?? 48,
        fontFamily: clip.fontFamily ?? "Georgia, serif",
        fontWeight: clip.fontWeight ?? "bold",
        fontStyle: clip.fontStyle ?? "normal",
        color: clip.color ?? "#ffffff",
        textAlign: clip.textAlign ?? "center",
        padding: "10px 20px",
        borderRadius: 4,
        maxWidth: "85%",
        wordBreak: "break-word",
        lineHeight: 1.25,
        filter: cssFilter !== "none" ? cssFilter : undefined,
        display: "inline-block",
      }}
    >
      {/* Highlighter marker reveal underlay */}
      {highlightEffect && highlightProgress > 0 && (
        <span
          style={{
            position: "absolute",
            left: "8px",
            bottom: mode === "underline" ? "4px" : "12%",
            height: mode === "underline" ? "5px" : mode === "box" ? "88%" : "52%",
            width: `calc(${highlightProgress * 100}% - 16px)`,
            backgroundColor: highlightColor,
            zIndex: 0,
            borderRadius: mode === "box" ? "4px" : "2px",
            opacity: 0.85,
            pointerEvents: "none",
            transform: "skewX(-6deg)",
            transformOrigin: "left bottom",
          }}
        />
      )}

      {/* Render text words: either staggered animation or normal text */}
      <span style={{ position: "relative", zIndex: 1 }}>
        {staggerEffect ? (
          words.map((word, idx) => {
            const staggerState = computeStaggerWordState(
              idx,
              frame,
              staggerParams.staggerDelay ?? 3
            );
            return (
              <span
                key={`${word}-${idx}`}
                style={{
                  display: "inline-block",
                  marginRight: "0.28em",
                  transform: `translateY(${staggerState.translateY}px)`,
                  opacity: staggerState.opacity,
                }}
              >
                {word}
              </span>
            );
          })
        ) : (
          textContent
        )}
      </span>
    </div>
  );
};

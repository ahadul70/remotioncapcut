import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ClipEffect, DropSettleParams, PaperCutoutParams, PaperSlideParams } from "../../state/editorTypes";
import { computeDropAndSettle, computePaperSlide } from "../../utils/animationUtils";

type PaperCutoutWrapperProps = {
  effects?: ClipEffect[];
  children: React.ReactNode;
};

export const PaperCutoutWrapper: React.FC<PaperCutoutWrapperProps> = ({ effects, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paperEffect = effects?.find((e) => e.type === "paper-cutout" && e.enabled);
  const dropEffect = effects?.find((e) => e.type === "drop-settle" && e.enabled);
  const slideEffect = effects?.find((e) => e.type === "paper-slide" && e.enabled);

  // If no paper-cutout or motion effects active, render children untouched
  if (!paperEffect && !dropEffect && !slideEffect) {
    return <>{children}</>;
  }

  const paperParams = (paperEffect?.params as PaperCutoutParams) || {};
  const dropParams = (dropEffect?.params as DropSettleParams) || {};
  const slideParams = (slideEffect?.params as PaperSlideParams) || {};

  // Motion calculations
  let animTranslateX = 0;
  let animTranslateY = 0;
  let animScale = 1;
  let animOpacity = 1;

  if (dropEffect) {
    const drop = computeDropAndSettle(frame, fps, dropParams);
    animTranslateY += drop.translateY;
    animScale *= drop.scale;
    animOpacity *= drop.opacity;
  }

  if (slideEffect) {
    const slide = computePaperSlide(frame, slideParams);
    animTranslateX += slide.translateX;
    animTranslateY += slide.translateY;
    animOpacity *= slide.opacity;
  }

  // Paper styling
  const borderWidth = paperEffect ? (paperParams.borderWidth ?? 8) : 0;
  const tilt = paperEffect ? (paperParams.tiltAngle ?? -2) : 0;
  const shadowElev = paperEffect ? ((paperParams.shadowElevation ?? 60) / 100) : 0;
  const tapeStyle = paperParams.tapeStyle ?? "corners";
  const tapeColor = paperParams.tapeColor ?? "rgba(254, 240, 138, 0.7)";

  const shadowCss = paperEffect
    ? `0 ${Math.round(14 * shadowElev)}px ${Math.round(28 * shadowElev)}px -5px rgba(0,0,0,${0.5 * shadowElev}), 0 ${Math.round(6 * shadowElev)}px ${Math.round(10 * shadowElev)}px -4px rgba(0,0,0,${0.4 * shadowElev})`
    : "none";

  return (
    <div
      style={{
        position: "relative",
        transform: `translate(${animTranslateX}px, ${animTranslateY}px) scale(${animScale}) rotate(${tilt}deg)`,
        opacity: animOpacity,
        padding: paperEffect ? `${borderWidth}px` : 0,
        backgroundColor: paperEffect ? (paperParams.paperColor ?? "#fbfbfa") : "transparent",
        boxShadow: shadowCss,
        borderRadius: paperEffect ? "3px" : "0px",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Tape Corners Accent (Vox Matte Aesthetic) */}
      {paperEffect && tapeStyle === "corners" && (
        <>
          <div
            style={{
              position: "absolute",
              top: -8,
              left: -8,
              width: 32,
              height: 14,
              backgroundColor: tapeColor,
              transform: "rotate(-35deg)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -8,
              right: -8,
              width: 32,
              height: 14,
              backgroundColor: tapeColor,
              transform: "rotate(-35deg)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {paperEffect && tapeStyle === "top-center" && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            width: 44,
            height: 16,
            marginLeft: -22,
            backgroundColor: tapeColor,
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />
      )}

      {children}
    </div>
  );
};

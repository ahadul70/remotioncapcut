import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { EditorialGraphicData } from "../../state/editorTypes";
import { computeBarProgress } from "../../utils/animationUtils";

type DataGraphicProps = {
  data?: EditorialGraphicData;
  cssFilter?: string;
};

export const DataGraphic: React.FC<DataGraphicProps> = ({ data, cssFilter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!data) {
    return null;
  }

  const { graphicType, comparisonBars, statCard, evidenceCard, percentageCard } = data;

  return (
    <div
      style={{
        filter: cssFilter !== "none" ? cssFilter : undefined,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      {/* 1. Comparison Bars Graphic */}
      {graphicType === "comparison-bars" && comparisonBars && (
        <div
          style={{
            backgroundColor: "#16181f",
            border: "1px solid #2d313d",
            borderRadius: "8px",
            padding: "24px 28px",
            width: "100%",
            maxWidth: "680px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px" }}>
            Comparative Analysis
          </div>

          {/* Bar A */}
          {(() => {
            const progress = computeBarProgress(frame, fps, 0, comparisonBars.animatedDurationFrames ?? 24);
            const currentVal = Math.round(comparisonBars.valueA * progress);
            return (
              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  <span>{comparisonBars.labelA}</span>
                  <span style={{ fontFamily: "monospace" }}>{currentVal}{comparisonBars.unit ?? "%"}</span>
                </div>
                <div style={{ height: "14px", backgroundColor: "#272a36", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, comparisonBars.valueA * progress))}%`,
                      backgroundColor: comparisonBars.colorA ?? "#3b82f6",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Bar B */}
          {(() => {
            const progress = computeBarProgress(frame, fps, 6, comparisonBars.animatedDurationFrames ?? 24);
            const currentVal = Math.round(comparisonBars.valueB * progress);
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  <span>{comparisonBars.labelB}</span>
                  <span style={{ fontFamily: "monospace" }}>{currentVal}{comparisonBars.unit ?? "%"}</span>
                </div>
                <div style={{ height: "14px", backgroundColor: "#272a36", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, comparisonBars.valueB * progress))}%`,
                      backgroundColor: comparisonBars.colorB ?? "#f43f5e",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. Stat Card Graphic */}
      {graphicType === "stat-card" && statCard && (
        <div
          style={{
            backgroundColor: "#16181f",
            border: "1px solid #2d313d",
            borderRadius: "8px",
            padding: "32px 36px",
            textAlign: "center",
            maxWidth: "600px",
            boxShadow: "0 12px 35px rgba(0,0,0,0.55)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "8px" }}>
            {statCard.label}
          </div>

          <div style={{ fontSize: "76px", fontWeight: 900, lineHeight: 1.1, fontFamily: "Georgia, serif", color: "#f8fafc" }}>
            {statCard.value}
          </div>

          {statCard.delta && (
            <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: statCard.deltaPositive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", padding: "4px 10px", borderRadius: "16px", fontSize: "13px", fontWeight: 700, color: statCard.deltaPositive ? "#4ade80" : "#f87171" }}>
              <span>{statCard.delta}</span>
            </div>
          )}

          {statCard.caption && (
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "14px" }}>
              {statCard.caption}
            </div>
          )}
        </div>
      )}

      {/* 3. Evidence Document Callout */}
      {graphicType === "evidence-card" && evidenceCard && (
        <div
          style={{
            backgroundColor: "#fdfbf7",
            border: "1px solid #e2ded5",
            borderRadius: "4px",
            padding: "28px 32px",
            maxWidth: "700px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            color: "#1e293b",
            fontFamily: "Georgia, serif",
            position: "relative",
          }}
        >
          {evidenceCard.headline && (
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px", fontFamily: "Inter, sans-serif" }}>
              {evidenceCard.headline}
            </div>
          )}

          <div style={{ fontSize: "24px", lineHeight: 1.4, fontStyle: "italic", marginBottom: "16px" }}>
            &ldquo;
            {evidenceCard.highlightedPhrase && evidenceCard.quote.includes(evidenceCard.highlightedPhrase) ? (
              <>
                {evidenceCard.quote.split(evidenceCard.highlightedPhrase)[0]}
                <span style={{ backgroundColor: "#fef08a", padding: "0 4px", borderRadius: "2px", fontStyle: "normal", fontWeight: 600 }}>
                  {evidenceCard.highlightedPhrase}
                </span>
                {evidenceCard.quote.split(evidenceCard.highlightedPhrase)[1]}
              </>
            ) : (
              evidenceCard.quote
            )}
            &rdquo;
          </div>

          <div style={{ fontSize: "12px", color: "#475569", fontWeight: 600, fontFamily: "Inter, sans-serif", borderTop: "1px solid #e2ded5", paddingTop: "10px" }}>
            — {evidenceCard.source}
          </div>
        </div>
      )}

      {/* 4. Percentage Card Graphic */}
      {graphicType === "percentage-card" && percentageCard && (
        <div
          style={{
            backgroundColor: "#16181f",
            border: "1px solid #2d313d",
            borderRadius: "8px",
            padding: "26px 30px",
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px" }}>
            {percentageCard.metric}
          </div>

          {(() => {
            const progress = computeBarProgress(frame, fps, 0, 24);
            const currentVal = Math.round(
              percentageCard.fromValue + (percentageCard.toValue - percentageCard.fromValue) * progress
            );

            return (
              <>
                <div style={{ fontSize: "52px", fontWeight: 900, fontFamily: "monospace", color: "#38bdf8" }}>
                  {currentVal}{percentageCard.unit ?? "%"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                  <span>Baseline: {percentageCard.fromValue}%</span>
                  <span>Target: {percentageCard.toValue}%</span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

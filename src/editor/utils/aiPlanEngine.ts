import { EditorState, Clip, EffectType } from "../state/editorTypes";
import {
  AiEditingPlan,
  AiPlanDiffItem,
  AiPlanOperation,
  AiPlanValidationError,
  AiPlanValidationResult,
} from "../state/aiPlanTypes";
import { clampEffectValue, EFFECT_METADATA } from "./effectAndTransitionUtils";

const VALID_EFFECT_TYPES: EffectType[] = [
  "brightness",
  "contrast",
  "saturation",
  "grayscale",
  "blur",
  "vignette",
  "paper-cutout",
  "drop-settle",
  "paper-slide",
  "text-highlight",
  "stagger-words",
];

/**
 * Validates an AI editing plan against the active editor state.
 * Pure function with zero mutations or side-effects.
 */
export function validateAiPlan(
  plan: AiEditingPlan,
  state: EditorState
): AiPlanValidationResult {
  const errors: AiPlanValidationError[] = [];
  const warnings: string[] = [];
  const diffSummary: AiPlanDiffItem[] = [];

  if (!plan || !Array.isArray(plan.operations) || plan.operations.length === 0) {
    return {
      isValid: false,
      errors: [{ message: "Editing plan contains no operations." }],
      warnings: [],
      diffSummary: [],
    };
  }

  // Create a fast map of clips and tracks
  const clipMap = new Map<string, Clip>();
  state.clips.forEach((c) => clipMap.set(c.id, c));

  const trackMap = new Map<string, (typeof state.tracks)[0]>();
  state.tracks.forEach((t) => trackMap.set(t.id, t));

  // In simulated execution, track changing clip durations / states across multiple ops
  const simulatedClips = new Map<string, Clip>();
  state.clips.forEach((c) => simulatedClips.set(c.id, { ...c }));

  plan.operations.forEach((op, idx) => {
    const originalClip = clipMap.get(op.clipId);
    const simClip = simulatedClips.get(op.clipId);

    if (!originalClip || !simClip) {
      errors.push({
        opIndex: idx,
        opType: op.type,
        clipId: op.clipId,
        message: `Clip with ID "${op.clipId}" does not exist in the project timeline.`,
      });
      return;
    }

    const track = trackMap.get(simClip.trackId);
    if (track?.locked) {
      errors.push({
        opIndex: idx,
        opType: op.type,
        clipId: op.clipId,
        message: `Cannot edit clip "${simClip.name}" because track "${track.name}" is locked.`,
      });
      return;
    }

    switch (op.type) {
      case "trim_end": {
        const { newDurationInFrames } = op;
        if (!Number.isInteger(newDurationInFrames)) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "newDurationInFrames",
            message: `Duration must be an integer number of frames (got ${newDurationInFrames}).`,
          });
          break;
        }

        if (newDurationInFrames < 5) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "newDurationInFrames",
            message: `Clip duration must be at least 5 frames (~0.17s) to prevent zero-length clips.`,
          });
          break;
        }

        const maxAvailable = simClip.sourceDurationInFrames - simClip.sourceStartFrame;
        if (newDurationInFrames > maxAvailable) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "newDurationInFrames",
            message: `Requested duration (${newDurationInFrames}f) exceeds source media bounds (${maxAvailable}f).`,
          });
          break;
        }

        diffSummary.push({
          clipId: simClip.id,
          clipName: simClip.name,
          operationType: "Trim End",
          summary: `Change duration from ${simClip.durationInFrames}f to ${newDurationInFrames}f (${(newDurationInFrames / state.fps).toFixed(2)}s)`,
          details: `Timeline range: [${simClip.timelineStartFrame}f -> ${simClip.timelineStartFrame + newDurationInFrames}f]`,
        });

        // Update simulated clip
        simulatedClips.set(simClip.id, { ...simClip, durationInFrames: newDurationInFrames });
        break;
      }

      case "trim_start": {
        const { newStartFrame } = op;
        if (!Number.isInteger(newStartFrame) || newStartFrame < 0) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "newStartFrame",
            message: `Start frame must be a non-negative integer (got ${newStartFrame}).`,
          });
          break;
        }

        const deltaFrames = newStartFrame - simClip.timelineStartFrame;
        if (deltaFrames === 0) {
          warnings.push(`Operation ${idx + 1} (${op.type}) results in no change to clip start frame.`);
          break;
        }

        if (deltaFrames > 0) {
          // Trimming inwards (shortening)
          const newDur = simClip.durationInFrames - deltaFrames;
          if (newDur < 5) {
            errors.push({
              opIndex: idx,
              opType: op.type,
              clipId: op.clipId,
              field: "newStartFrame",
              message: `Trimming start to frame ${newStartFrame} would leave clip with less than 5 frames (${newDur}f).`,
            });
            break;
          }
        } else {
          // Extending outwards (lengthening)
          const availableSource = simClip.sourceStartFrame;
          if (-deltaFrames > availableSource) {
            errors.push({
              opIndex: idx,
              opType: op.type,
              clipId: op.clipId,
              field: "newStartFrame",
              message: `Cannot extend clip start before frame 0 of source media (available head: ${availableSource}f).`,
            });
            break;
          }
        }

        diffSummary.push({
          clipId: simClip.id,
          clipName: simClip.name,
          operationType: "Trim Start",
          summary: `Shift timeline start from ${simClip.timelineStartFrame}f to ${newStartFrame}f`,
          details: `Source offset adjusted by ${deltaFrames > 0 ? `+${deltaFrames}` : deltaFrames} frames`,
        });

        const newSourceStart = simClip.sourceStartFrame + deltaFrames;
        const newDuration = simClip.durationInFrames - deltaFrames;
        simulatedClips.set(simClip.id, {
          ...simClip,
          timelineStartFrame: newStartFrame,
          sourceStartFrame: newSourceStart,
          durationInFrames: newDuration,
        });
        break;
      }

      case "split": {
        const { splitFrame } = op;
        if (!Number.isInteger(splitFrame)) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "splitFrame",
            message: `Split frame must be an integer (got ${splitFrame}).`,
          });
          break;
        }

        const clipStart = simClip.timelineStartFrame;
        const clipEnd = simClip.timelineStartFrame + simClip.durationInFrames;

        if (splitFrame <= clipStart || splitFrame >= clipEnd) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "splitFrame",
            message: `Split frame ${splitFrame} is outside clip "${simClip.name}" bounds [${clipStart}f -> ${clipEnd}f].`,
          });
          break;
        }

        const firstPartFrames = splitFrame - clipStart;
        const secondPartFrames = clipEnd - splitFrame;

        diffSummary.push({
          clipId: simClip.id,
          clipName: simClip.name,
          operationType: "Split",
          summary: `Split into two parts at frame ${splitFrame} (${(splitFrame / state.fps).toFixed(2)}s)`,
          details: `Part 1: ${firstPartFrames}f, Part 2: ${secondPartFrames}f`,
        });

        // Update simulated state
        simulatedClips.set(simClip.id, { ...simClip, durationInFrames: firstPartFrames });
        break;
      }

      case "apply_effect": {
        const { effectType, value } = op;
        if (!VALID_EFFECT_TYPES.includes(effectType)) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "effectType",
            message: `Effect type "${effectType}" is unsupported. Supported: ${VALID_EFFECT_TYPES.join(", ")}`,
          });
          break;
        }

        if (!Number.isFinite(value)) {
          errors.push({
            opIndex: idx,
            opType: op.type,
            clipId: op.clipId,
            field: "value",
            message: `Effect value must be a finite number.`,
          });
          break;
        }

        const meta = EFFECT_METADATA[effectType];
        const label = meta ? meta.label : effectType;
        const clampedVal = clampEffectValue(effectType, value);

        diffSummary.push({
          clipId: simClip.id,
          clipName: simClip.name,
          operationType: "Apply Effect",
          summary: `Apply "${label}" effect with value ${clampedVal}${meta?.unit || ""}`,
          details: op.params ? `Params: ${JSON.stringify(op.params)}` : undefined,
        });
        break;
      }

      default: {
        const unknownOp = op as { type: string };
        errors.push({
          opIndex: idx,
          opType: unknownOp.type,
          message: `Operation type "${unknownOp.type}" is not supported by this AI prototype.`,
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    diffSummary,
  };
}

/**
 * Deterministic Mock AI Planner.
 * Parses user prompts into structured, validated plans without any external API calls.
 */
export function generateMockAiPlan(
  rawPrompt: string,
  state: EditorState
): AiEditingPlan | null {
  const prompt = rawPrompt.trim();
  if (!prompt) return null;

  const lower = prompt.toLowerCase();
  const fps = state.fps || 30;

  // Resolve target clip:
  // 1. Look for clip name mentioned in prompt
  // 2. Or currently selected clip
  // 3. Or first available clip
  let targetClip: Clip | null = null;
  for (const c of state.clips) {
    const cleanName = c.name.toLowerCase();
    const baseName = cleanName.replace(/\.[^/.]+$/, ""); // strip extension
    if (lower.includes(cleanName) || lower.includes(baseName)) {
      targetClip = c;
      break;
    }
  }

  if (!targetClip) {
    if (state.selectedClipId) {
      targetClip = state.clips.find((c) => c.id === state.selectedClipId) || null;
    }
    if (!targetClip && state.clips.length > 0) {
      targetClip = state.clips[0];
    }
  }

  if (!targetClip) return null;

  const planId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const operations: AiPlanOperation[] = [];

  // Helper to extract duration in frames (handles "5s", "5 seconds", "150 frames", "150f")
  const parseSecondsOrFrames = (text: string): number | null => {
    const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)/i);
    if (secMatch) {
      return Math.round(parseFloat(secMatch[1]) * fps);
    }
    const frameMatch = text.match(/(\d+)\s*(?:f|frames?)/i);
    if (frameMatch) {
      return parseInt(frameMatch[1], 10);
    }
    const plainNum = text.match(/\b(\d+)\b/);
    if (plainNum) {
      const val = parseInt(plainNum[1], 10);
      return val <= 120 ? val * fps : val;
    }
    return null;
  };

  // Pattern A: Compound: Split and apply effect
  if (lower.includes("split") && (lower.includes("vignette") || lower.includes("grayscale") || lower.includes("black and white"))) {
    const splitFrame = state.currentFrame > targetClip.timelineStartFrame &&
      state.currentFrame < targetClip.timelineStartFrame + targetClip.durationInFrames
        ? state.currentFrame
        : targetClip.timelineStartFrame + Math.floor(targetClip.durationInFrames / 2);

    operations.push({
      type: "split",
      clipId: targetClip.id,
      splitFrame,
    });

    const effectType: EffectType = lower.includes("vignette") ? "vignette" : "grayscale";
    const value = effectType === "vignette" ? 65 : 100;
    operations.push({
      type: "apply_effect",
      clipId: targetClip.id,
      effectType,
      value,
    });

    return {
      id: planId,
      prompt,
      title: `Split "${targetClip.name}" and Apply ${effectType === "vignette" ? "Vignette" : "Grayscale"}`,
      description: `Split clip at frame ${splitFrame} and apply visual enhancement to part 1.`,
      operations,
    };
  }

  // Pattern B: Shorten / Trim End
  if (
    lower.includes("shorten") ||
    lower.includes("trim end") ||
    lower.includes("cut to") ||
    lower.includes("make it") ||
    lower.includes("duration")
  ) {
    const parsedFrames = parseSecondsOrFrames(lower);
    const targetDuration = parsedFrames !== null ? parsedFrames : Math.min(150, Math.floor(targetClip.durationInFrames / 2));
    const safeDuration = Math.max(5, Math.min(targetDuration, targetClip.sourceDurationInFrames - targetClip.sourceStartFrame));

    operations.push({
      type: "trim_end",
      clipId: targetClip.id,
      newDurationInFrames: safeDuration,
    });

    return {
      id: planId,
      prompt,
      title: `Shorten "${targetClip.name}" to ${(safeDuration / fps).toFixed(1)}s`,
      description: `Set clip duration to ${safeDuration} frames based on requested length.`,
      operations,
    };
  }

  // Pattern C: Trim Start
  if (lower.includes("trim start") || lower.includes("trim head") || lower.includes("trim first") || lower.includes("cut first")) {
    const parsedFrames = parseSecondsOrFrames(lower) || Math.min(60, Math.floor(targetClip.durationInFrames / 3));
    const newStart = targetClip.timelineStartFrame + parsedFrames;

    operations.push({
      type: "trim_start",
      clipId: targetClip.id,
      newStartFrame: newStart,
    });

    return {
      id: planId,
      prompt,
      title: `Trim First ${(parsedFrames / fps).toFixed(1)}s of "${targetClip.name}"`,
      description: `Move timeline start to frame ${newStart} and trim ${parsedFrames} frames from head.`,
      operations,
    };
  }

  // Pattern D: Split
  if (lower.includes("split") || lower.includes("cut at")) {
    let splitFrame = state.currentFrame;
    const parsed = parseSecondsOrFrames(lower);
    if (parsed !== null && parsed > targetClip.timelineStartFrame && parsed < targetClip.timelineStartFrame + targetClip.durationInFrames) {
      splitFrame = parsed;
    } else if (
      splitFrame <= targetClip.timelineStartFrame ||
      splitFrame >= targetClip.timelineStartFrame + targetClip.durationInFrames
    ) {
      // Split in center if playhead is out of bounds
      splitFrame = targetClip.timelineStartFrame + Math.floor(targetClip.durationInFrames / 2);
    }

    operations.push({
      type: "split",
      clipId: targetClip.id,
      splitFrame,
    });

    return {
      id: planId,
      prompt,
      title: `Split "${targetClip.name}" at Frame ${splitFrame}`,
      description: `Divide clip into two sequential parts at frame ${splitFrame} (${(splitFrame / fps).toFixed(2)}s).`,
      operations,
    };
  }

  // Pattern E: Visual Effects
  if (
    lower.includes("vignette") ||
    lower.includes("grayscale") ||
    lower.includes("black and white") ||
    lower.includes("contrast") ||
    lower.includes("saturation") ||
    lower.includes("blur") ||
    lower.includes("paper cutout") ||
    lower.includes("brightness")
  ) {
    let effectType: EffectType = "vignette";
    let value = 60;

    if (lower.includes("grayscale") || lower.includes("black and white")) {
      effectType = "grayscale";
      value = 100;
    } else if (lower.includes("contrast")) {
      effectType = "contrast";
      value = 130;
    } else if (lower.includes("saturation")) {
      effectType = "saturation";
      value = 135;
    } else if (lower.includes("blur")) {
      effectType = "blur";
      value = 4;
    } else if (lower.includes("paper cutout")) {
      effectType = "paper-cutout";
      value = 70;
    } else if (lower.includes("brightness")) {
      effectType = "brightness";
      value = 115;
    }

    // Check for custom numeric value in prompt (e.g., "contrast 140" or "vignette 80")
    const numMatch = lower.match(/\b(\d{1,3})\b/);
    if (numMatch) {
      const explicitVal = parseInt(numMatch[1], 10);
      if (explicitVal >= 0 && explicitVal <= 200) {
        value = explicitVal;
      }
    }

    operations.push({
      type: "apply_effect",
      clipId: targetClip.id,
      effectType,
      value,
    });

    return {
      id: planId,
      prompt,
      title: `Apply ${effectType} Effect to "${targetClip.name}"`,
      description: `Enable ${effectType} with parameter value ${value}.`,
      operations,
    };
  }

  // Fallback default: If prompt was entered but unrecognized, provide a sensible shortening plan
  operations.push({
    type: "trim_end",
    clipId: targetClip.id,
    newDurationInFrames: Math.max(30, Math.floor(targetClip.durationInFrames * 0.75)),
  });

  return {
    id: planId,
    prompt,
    title: `Trim "${targetClip.name}" End (Interpreted Query)`,
    description: `Adjusted clip end to 75% of current duration based on prompt intent.`,
    operations,
  };
}

/**
 * Transactional plan execution.
 * Validates the entire plan upfront and executes it step-by-step.
 * If any step fails, aborts and returns the untouched state (full rollback).
 */
export function executeAiPlanTransaction(
  state: EditorState,
  plan: AiEditingPlan
): { success: boolean; state: EditorState; error?: string } {
  const validation = validateAiPlan(plan, state);
  if (!validation.isValid) {
    return {
      success: false,
      state,
      error: validation.errors.map((e) => e.message).join(" | "),
    };
  }

  // Import dynamically or use standard reducer logic to guarantee identical behavior
  // We apply pure reducer transformations sequentially to a working state
  let workingState = state;

  try {
    for (const op of plan.operations) {
      switch (op.type) {
        case "trim_end": {
          const clip = workingState.clips.find((c) => c.id === op.clipId);
          if (!clip) throw new Error(`Clip ${op.clipId} missing during transaction`);

          const updatedClips = workingState.clips.map((c) =>
            c.id === op.clipId ? { ...c, durationInFrames: op.newDurationInFrames } : c
          );

          const maxEnd = Math.max(...updatedClips.map((c) => c.timelineStartFrame + c.durationInFrames));
          workingState = {
            ...workingState,
            clips: updatedClips,
            totalDurationInFrames: Math.max(workingState.totalDurationInFrames, maxEnd + 30),
            saveStatus: "unsaved",
          };
          break;
        }

        case "trim_start": {
          const clip = workingState.clips.find((c) => c.id === op.clipId);
          if (!clip) throw new Error(`Clip ${op.clipId} missing during transaction`);

          const deltaFrames = op.newStartFrame - clip.timelineStartFrame;
          const newTimelineStart = op.newStartFrame;
          const newSourceStart = clip.sourceStartFrame + deltaFrames;
          const newDuration = clip.durationInFrames - deltaFrames;

          const updatedClips = workingState.clips.map((c) =>
            c.id === op.clipId
              ? {
                  ...c,
                  timelineStartFrame: newTimelineStart,
                  sourceStartFrame: newSourceStart,
                  durationInFrames: newDuration,
                }
              : c
          );

          const maxEnd = Math.max(...updatedClips.map((c) => c.timelineStartFrame + c.durationInFrames));
          workingState = {
            ...workingState,
            clips: updatedClips,
            totalDurationInFrames: Math.max(workingState.totalDurationInFrames, maxEnd + 30),
            saveStatus: "unsaved",
          };
          break;
        }

        case "split": {
          const clip = workingState.clips.find((c) => c.id === op.clipId);
          if (!clip) throw new Error(`Clip ${op.clipId} missing during transaction`);

          const offset = op.splitFrame - clip.timelineStartFrame;
          const firstDuration = offset;
          const secondDuration = clip.durationInFrames - offset;

          const baseName = clip.name.replace(/ \(Part \d+\)$/, "");
          const existingPartMatch = clip.name.match(/\(Part (\d+)\)$/);
          const firstPartNum = existingPartMatch ? parseInt(existingPartMatch[1], 10) : 1;
          const secondPartNum = firstPartNum + 1;

          const firstClip: Clip = {
            ...clip,
            name: existingPartMatch ? clip.name : `${baseName} (Part 1)`,
            durationInFrames: firstDuration,
          };

          const secondClipId = `clip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const secondClip: Clip = {
            ...clip,
            id: secondClipId,
            name: `${baseName} (Part ${secondPartNum})`,
            timelineStartFrame: op.splitFrame,
            durationInFrames: secondDuration,
            sourceStartFrame: clip.sourceStartFrame + firstDuration,
          };

          const updatedClips = workingState.clips
            .flatMap((c) => (c.id === clip.id ? [firstClip, secondClip] : [c]))
            .sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);

          workingState = {
            ...workingState,
            clips: updatedClips,
            selectedClipId: secondClipId,
            saveStatus: "unsaved",
          };
          break;
        }

        case "apply_effect": {
          const clip = workingState.clips.find((c) => c.id === op.clipId);
          if (!clip) throw new Error(`Clip ${op.clipId} missing during transaction`);

          const currentEffects = clip.effects ? [...clip.effects] : [];
          const existingIndex = currentEffects.findIndex((e) => e.type === op.effectType);
          const clampedVal = clampEffectValue(op.effectType, op.value);

          if (existingIndex >= 0) {
            currentEffects[existingIndex] = {
              ...currentEffects[existingIndex],
              enabled: true,
              value: clampedVal,
              params: op.params
                ? { ...(currentEffects[existingIndex].params || {}), ...op.params }
                : currentEffects[existingIndex].params,
            };
          } else {
            currentEffects.push({
              id: `eff-${op.effectType}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              type: op.effectType,
              enabled: true,
              value: clampedVal,
              params: op.params,
            });
          }

          const updatedClips = workingState.clips.map((c) =>
            c.id === op.clipId ? { ...c, effects: currentEffects } : c
          );

          workingState = {
            ...workingState,
            clips: updatedClips,
            saveStatus: "unsaved",
          };
          break;
        }
      }
    }

    return {
      success: true,
      state: workingState,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      state, // full rollback
      error: `Transaction rolled back: ${msg}`,
    };
  }
}

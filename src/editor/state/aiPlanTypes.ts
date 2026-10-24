import { EffectType } from "./editorTypes";

export type AiTrimEndOp = {
  type: "trim_end";
  clipId: string;
  newDurationInFrames: number;
};

export type AiTrimStartOp = {
  type: "trim_start";
  clipId: string;
  newStartFrame: number;
};

export type AiSplitOp = {
  type: "split";
  clipId: string;
  splitFrame: number;
};

export type AiApplyEffectOp = {
  type: "apply_effect";
  clipId: string;
  effectType: EffectType;
  value: number;
  params?: Record<string, unknown>;
};

export type AiPlanOperation = AiTrimEndOp | AiTrimStartOp | AiSplitOp | AiApplyEffectOp;

export type AiEditingPlan = {
  id: string;
  prompt: string;
  title: string;
  description: string;
  operations: AiPlanOperation[];
};

export type AiPlanValidationError = {
  opIndex?: number;
  opType?: string;
  clipId?: string;
  field?: string;
  message: string;
};

export type AiPlanDiffItem = {
  clipId: string;
  clipName: string;
  operationType: string;
  summary: string;
  details?: string;
};

export type AiPlanValidationResult = {
  isValid: boolean;
  errors: AiPlanValidationError[];
  warnings: string[];
  diffSummary: AiPlanDiffItem[];
};

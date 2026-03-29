/**
 * Request shapes for ai-lesson-plan.
 * - v1 (legacy): flat JSON from the current web client (no version field).
 * - v2: { version: 2, mode, optional lesson{}, optional snapshot, ... }.
 */

export type LessonPlanGenerationMode = "reflection" | "context_snapshot";

export interface NormalizedLessonPlanRequest {
  version: 1 | 2;
  mode: LessonPlanGenerationMode;
  planType: "hourly" | "weekly";
  gradeLevel: string;
  classroom: string;
  subject: string;
  /** เช่น หน่วยการเรียนที่ 1 */
  learningUnit: string;
  hours: number;
  topic: string;
  includeWorksheets: boolean;
  context: string;
  addonType?: string;
  /** Optional structured snapshot for context_snapshot mode (Phase 3–4). */
  snapshot?: Record<string, unknown>;
}

export type ParseLessonPlanBodyResult =
  | { ok: true; value: NormalizedLessonPlanRequest }
  | { ok: false; error: string };

const META_V2 = new Set(["version", "lesson", "snapshot", "mode"]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * Flattens v2 body: fields inside `lesson` plus top-level plan fields (excluding meta keys).
 */
export function extractV2PlanFields(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof o.lesson === "object" && o.lesson !== null && !Array.isArray(o.lesson)) {
    Object.assign(out, o.lesson as Record<string, unknown>);
  }
  for (const [k, v] of Object.entries(o)) {
    if (!META_V2.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Maps legacy flat payload (v1 client) to normalized request. Ignores unknown keys.
 */
export function mapLegacyPayload(o: Record<string, unknown>): ParseLessonPlanBodyResult {
  const planType = o.planType === "weekly" ? "weekly" : "hourly";
  const value: NormalizedLessonPlanRequest = {
    version: 1,
    mode: "reflection",
    planType,
    gradeLevel: str(o.gradeLevel),
    classroom: str(o.classroom),
    subject: str(o.subject),
    learningUnit: str(o.learningUnit),
    hours: num(o.hours, 3),
    topic: str(o.topic),
    includeWorksheets: bool(o.includeWorksheets),
    context: str(o.context),
    addonType: typeof o.addonType === "string" && o.addonType ? o.addonType : undefined,
    snapshot: undefined,
  };
  return { ok: true, value };
}

function parseV2(o: Record<string, unknown>): ParseLessonPlanBodyResult {
  const fields = extractV2PlanFields(o);
  const base = mapLegacyPayload(fields);
  if (!base.ok) return base;

  const mode: LessonPlanGenerationMode =
    o.mode === "context_snapshot" ? "context_snapshot" : "reflection";

  let snapshot: Record<string, unknown> | undefined;
  if (o.snapshot !== undefined) {
    if (typeof o.snapshot !== "object" || o.snapshot === null || Array.isArray(o.snapshot)) {
      return { ok: false, error: "snapshot must be an object when provided" };
    }
    snapshot = o.snapshot as Record<string, unknown>;
  }

  return {
    ok: true,
    value: {
      ...base.value,
      version: 2,
      mode,
      snapshot,
    },
  };
}

export function parseLessonPlanBody(raw: unknown): ParseLessonPlanBodyResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Invalid request body" };
  }
  const o = raw as Record<string, unknown>;
  if (o.version === 2) {
    return parseV2(o);
  }
  return mapLegacyPayload(o);
}

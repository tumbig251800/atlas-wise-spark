export type ValidationLevel = "clean" | "warning" | "suspect";

export interface SummaryValidation {
  level: ValidationLevel;
  flaggedCount: number;
  totalNumbers: number;
  disclaimer: string | null;
}

import type { SummaryValidation } from "@/types/validation";

export function ValidationDisclaimer({
  validation,
}: {
  validation: SummaryValidation | null;
}) {
  if (!validation || validation.level === "clean") return null;

  if (validation.level === "warning") {
    return (
      <p className="text-xs text-yellow-400 mt-2 pt-2 border-t border-yellow-400/20">
        {validation.disclaimer}
      </p>
    );
  }

  return (
    <div className="text-xs text-red-400 mt-2 p-2 bg-red-400/10 rounded border border-red-400/20">
      {validation.disclaimer}
    </div>
  );
}

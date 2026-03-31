import { Loader2 } from "lucide-react";

/** Shown while lazy route chunks load (Stage 5 code-splitting). */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <span className="text-sm">กำลังโหลดหน้า…</span>
    </div>
  );
}

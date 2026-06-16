import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/hooks/useActionItems";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface IntegrityFlagBannerProps {
  flags: ActionItem[];
}

export function IntegrityFlagBanner({ flags }: IntegrityFlagBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (flags.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-2 border-amber-400 bg-amber-50">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-900 font-semibold">
        ⚠️ พบ Integrity Flag ({flags.length} รายการ)
      </AlertTitle>
      <AlertDescription className="text-amber-800 mt-2">
        <div className="space-y-2">
          <p className="text-sm">
            รายการเหล่านี้เป็นปัญหาด้านความน่าเชื่อถือของข้อมูล ต้องตรวจสอบและแก้ไขก่อนที่จะนำเข้า PLC Queue
          </p>

          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  {expanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-3">
              <div className="space-y-2 bg-white/50 rounded-md p-3 border border-amber-200">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-amber-100 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-medium text-amber-900">
                        {flag.teacher_name ?? "ไม่ระบุ"} · {flag.classroom ?? "ไม่ระบุ"} · {flag.subject ?? "ไม่ระบุ"}
                      </div>
                      <div className="text-xs text-amber-700">{flag.detail}</div>
                      {flag.metric_label && (
                        <div className="text-xs text-muted-foreground">
                          {flag.metric_label}: {flag.metric_value ?? "N/A"}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        // Navigate to action item detail or open in new tab
                        const url = `/action-board?id=${flag.id}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </AlertDescription>
    </Alert>
  );
}

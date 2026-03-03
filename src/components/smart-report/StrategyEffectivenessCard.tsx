import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";
import type { SmartReport } from "@/types/smartReport";

interface Props {
  report: SmartReport;
}

function effIcon(e: string) {
  if (e === "positive") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (e === "negative") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function effLabel(e: string) {
  if (e === "positive") return "ดีขึ้น";
  if (e === "negative") return "แย่ลง";
  return "คงที่";
}

export function StrategyEffectivenessCard({ report }: Props) {
  const items = report.strategyEffectiveness;

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ผลกลยุทธ์</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ข้อมูลไม่เพียงพอ — ต้องมีอย่างน้อย 2 คาบต่อหน่วย
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ผลกลยุทธ์ (หน่วยที่มีหลายคาบ)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((x) => (
            <div
              key={x.unitKey}
              className="flex items-start gap-3 rounded border px-3 py-2 text-sm"
            >
              <div className="mt-0.5">{effIcon(x.effectiveness)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{x.unitKey}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {x.gapBefore} → {x.gapAfter}
                </p>
                <p className="text-xs mt-1 truncate" title={x.strategy}>
                  กลยุทธ์: {x.strategy}
                </p>
              </div>
              <Badge variant="outline">{effLabel(x.effectiveness)}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

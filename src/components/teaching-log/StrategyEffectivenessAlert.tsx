import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb } from "lucide-react";
import type { StrategyEffectiveness } from "@/hooks/useStrategyHistory";

interface StrategyEffectivenessAlertProps {
  currentStrategy: string;
  effectiveness: StrategyEffectiveness[];
  currentMastery: number | null;
  previousMastery: number | null;
}

export function StrategyEffectivenessAlert({
  currentStrategy,
  effectiveness,
  currentMastery,
  previousMastery,
}: StrategyEffectivenessAlertProps) {
  // ไม่แสดงถ้าไม่มีข้อมูล
  if (effectiveness.length === 0) return null;

  // หา effectiveness ของ strategy ปัจจุบัน
  const currentStrategyData = effectiveness.find((e) => e.strategy === currentStrategy);

  // กรณี: เลือก strategy เดิมซ้ำ แต่คะแนนไม่ดีขึ้น
  const isRepeatStrategy = currentStrategyData && currentStrategyData.usageCount >= 2;
  const isNotImproving = currentMastery && previousMastery && currentMastery <= previousMastery;
  const strategyNotEffective = currentStrategyData && !currentStrategyData.isEffective;

  // แนะนำ strategy ที่ดีกว่า
  const betterStrategies = effectiveness.filter(
    (e) => e.isEffective && e.strategy !== currentStrategy
  ).slice(0, 2);

  // แสดง warning ถ้า:
  // 1. เลือก strategy ซ้ำแต่ไม่ได้ผล
  // 2. หรือ strategy นี้ไม่เคยได้ผลในอดีต
  const shouldShowWarning = (isRepeatStrategy && isNotImproving) || strategyNotEffective;

  if (!shouldShowWarning && betterStrategies.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Warning Alert */}
      {shouldShowWarning && currentStrategyData && (
        <Alert variant="destructive" className="border-[hsl(var(--atlas-warning))] bg-[hsl(var(--atlas-warning))]/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">⚠️ กลยุทธ์นี้อาจไม่เหมาะสม</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>
              คุณใช้ <strong>{currentStrategy}</strong> ไปแล้ว{" "}
              <Badge variant="outline" className="text-xs">
                {currentStrategyData.usageCount} ครั้ง
              </Badge>
            </p>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span>
                คะแนน Mastery เปลี่ยนจาก{" "}
                <strong>{currentStrategyData.avgMasteryBefore.toFixed(1)}</strong> →{" "}
                <strong>{currentStrategyData.avgMasteryAfter.toFixed(1)}</strong>
                {currentStrategyData.improvement > 0 ? " (ดีขึ้นเล็กน้อย)" : " (ไม่ดีขึ้น)"}
              </span>
            </div>
            {isRepeatStrategy && isNotImproving && (
              <p className="text-xs text-destructive mt-2">
                💡 <strong>คำแนะนำ:</strong> ลองเปลี่ยนวิธีการสอนใหม่ อาจได้ผลดีกว่า
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendation Alert */}
      {betterStrategies.length > 0 && (
        <Alert className="border-[hsl(var(--atlas-info))] bg-[hsl(var(--atlas-info))]/10">
          <Lightbulb className="h-4 w-4 text-[hsl(var(--atlas-info))]" />
          <AlertTitle className="text-sm font-semibold">💡 กลยุทธ์ที่ได้ผลดีในอดีต</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            {betterStrategies.map((strategy) => (
              <div key={strategy.strategy} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                <TrendingUp className="h-3 w-3 text-[hsl(var(--atlas-success))]" />
                <div className="flex-1">
                  <p className="font-medium">{strategy.strategy}</p>
                  <p className="text-xs text-muted-foreground">
                    ใช้ไป {strategy.usageCount} ครั้ง • คะแนนเพิ่มขึ้นเฉลี่ย{" "}
                    <strong className="text-[hsl(var(--atlas-success))]">
                      +{strategy.improvement.toFixed(1)}
                    </strong>
                  </p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              📊 ข้อมูลจากการสอน 30 วันย้อนหลัง
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

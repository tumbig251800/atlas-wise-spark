import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StrategyHistoryEntry {
  teaching_date: string;
  next_strategy: string;
  mastery_score: number;
  major_gap: string;
}

export interface StrategyEffectiveness {
  strategy: string;
  usageCount: number;
  avgMasteryBefore: number;
  avgMasteryAfter: number;
  improvement: number;
  isEffective: boolean;
}

interface UseStrategyHistoryParams {
  teacherId: string;
  subject: string;
  classroom: string;
  gradeLevel: string;
}

export function useStrategyHistory({
  teacherId,
  subject,
  classroom,
  gradeLevel,
}: UseStrategyHistoryParams) {
  const [history, setHistory] = useState<StrategyHistoryEntry[]>([]);
  const [effectiveness, setEffectiveness] = useState<StrategyEffectiveness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId || !subject || !classroom || !gradeLevel) {
      setLoading(false);
      return;
    }

    async function fetchStrategyHistory() {
      try {
        // คำนวณภาคเรียนปัจจุบัน (academic_term)
        const now = new Date();
        const year = now.getFullYear() + 543; // Buddhist year
        const month = now.getMonth() + 1;
        // ภาคเรียนที่ 1: พ.ค. - ก.ย. (5-9)
        // ภาคเรียนที่ 2: พ.ย. - มี.ค. (11-3)
        const term = (month >= 5 && month <= 9) ? 1 : 2;
        const termYear = (month >= 1 && month <= 3) ? year - 1 : year;
        const currentTerm = `${termYear}/${term}`;

        // คำนวณวันที่ย้อนหลัง 30 วัน
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        // ดึงประวัติ teaching logs: เฉพาะภาคเรียนปัจจุบัน + ย้อนหลังไม่เกิน 30 วัน
        const { data: logs, error } = await supabase
          .from("teaching_logs")
          .select("teaching_date, next_strategy, mastery_score, major_gap, academic_term")
          .eq("teacher_id", teacherId)
          .eq("subject", subject)
          .eq("classroom", classroom)
          .eq("grade_level", gradeLevel)
          .eq("academic_term", currentTerm)
          .gte("teaching_date", thirtyDaysAgo)
          .order("teaching_date", { ascending: true });

        if (error) throw error;

        if (!logs || logs.length === 0) {
          setHistory([]);
          setEffectiveness([]);
          setLoading(false);
          return;
        }

        setHistory(logs as StrategyHistoryEntry[]);

        // คำนวณ effectiveness แต่ละ strategy
        const strategyMap = new Map<string, {
          count: number;
          masteryBefore: number[];
          masteryAfter: number[];
        }>();

        for (let i = 0; i < logs.length - 1; i++) {
          const current = logs[i];
          const next = logs[i + 1];

          if (!current.next_strategy) continue;

          if (!strategyMap.has(current.next_strategy)) {
            strategyMap.set(current.next_strategy, {
              count: 0,
              masteryBefore: [],
              masteryAfter: [],
            });
          }

          const entry = strategyMap.get(current.next_strategy)!;
          entry.count++;
          entry.masteryBefore.push(current.mastery_score);
          entry.masteryAfter.push(next.mastery_score);
        }

        const effectivenessData: StrategyEffectiveness[] = [];
        strategyMap.forEach((data, strategy) => {
          const avgBefore = data.masteryBefore.reduce((a, b) => a + b, 0) / data.masteryBefore.length;
          const avgAfter = data.masteryAfter.reduce((a, b) => a + b, 0) / data.masteryAfter.length;
          const improvement = avgAfter - avgBefore;

          effectivenessData.push({
            strategy,
            usageCount: data.count,
            avgMasteryBefore: avgBefore,
            avgMasteryAfter: avgAfter,
            improvement,
            isEffective: improvement > 0.3, // ปรับขึ้น > 0.3 ถือว่ามีผล
          });
        });

        // เรียงตาม improvement (มากไปน้อย)
        effectivenessData.sort((a, b) => b.improvement - a.improvement);

        setEffectiveness(effectivenessData);
      } catch (error) {
        console.error("Failed to fetch strategy history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStrategyHistory();
  }, [teacherId, subject, classroom, gradeLevel]);

  return { history, effectiveness, loading };
}

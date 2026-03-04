/**
 * Phase E: Digital Checklist for classroom assessment
 * 8 capabilities with Behavioral Indicators (placeholders until 2026 manual mapping)
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CAPABILITY_LABELS_2026,
  CAPABILITY_KEYS_2026,
  type CapabilityKey2026,
} from "@/lib/capabilityConstants2026";

export interface ActiveClassroomAssessmentProps {
  studentId: string;
  unitName: string;
  subject: string;
  gradeLevel: string;
  classroom: string;
  academicTerm: string;
  onSave: (payload: {
    scores: Record<CapabilityKey2026, number>;
    score: number;
    total_score: number;
  }) => void;
}

/** Placeholder: 4 indicator checkboxes per capability (maps 0-4 checked -> 1-4 score) */
const INDICATOR_COUNT = 4;

export function ActiveClassroomAssessment({
  studentId,
  unitName,
  subject,
  gradeLevel,
  classroom,
  academicTerm,
  onSave,
}: ActiveClassroomAssessmentProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(10);

  const toggle = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const countChecked = useCallback(
    (cap: CapabilityKey2026): number => {
      let n = 0;
      for (let i = 0; i < INDICATOR_COUNT; i++) {
        if (checked[`${cap}_${i}`]) n++;
      }
      return n;
    },
    [checked]
  );

  const deriveScore = useCallback(
    (cap: CapabilityKey2026): number => {
      const n = countChecked(cap);
      if (n === 0) return 0;
      return Math.min(4, Math.max(1, n)) as 1 | 2 | 3 | 4;
    },
    [countChecked]
  );

  const handleSave = useCallback(() => {
    const scores = {} as Record<CapabilityKey2026, number>;
    for (const k of CAPABILITY_KEYS_2026) {
      scores[k] = deriveScore(k);
    }
    onSave({
      scores,
      score,
      total_score: totalScore,
    });
  }, [deriveScore, score, totalScore, onSave]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>แบบประเมินสมรรถนะในชั้นเรียน (หลักสูตร 2569)</CardTitle>
        <p className="text-sm text-muted-foreground">
          นักเรียน: {studentId} | หน่วย: {unitName} | วิชา: {subject} | ป.{gradeLevel}/{classroom} | เทอม: {academicTerm}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>คะแนนวิชา</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>คะแนนเต็ม</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={totalScore}
              onChange={(e) => setTotalScore(Number(e.target.value) || 10)}
            />
          </div>
        </div>

        {CAPABILITY_KEYS_2026.map((cap) => (
          <div key={cap} className="rounded-lg border p-3">
            <p className="font-medium mb-2">{CAPABILITY_LABELS_2026[cap]}</p>
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: INDICATOR_COUNT }, (_, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={!!checked[`${cap}_${i}`]}
                    onCheckedChange={() => toggle(`${cap}_${i}`)}
                  />
                  <span>
                    ตัวชี้วัด {i + 1}
                    {i === 0 && " (placeholder)"}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              คะแนนที่ได้: {deriveScore(cap) || "-"} (จากตัวชี้วัดที่เลือก)
            </p>
          </div>
        ))}

        <Button onClick={handleSave}>บันทึกการประเมิน</Button>
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSearch, BookOpen } from "lucide-react";
import { useClassroomResearch } from "@/hooks/useClassroomResearch";
import { useUserRole } from "@/hooks/useUserRole";
import { ResearchCard } from "@/components/classroom-research/ResearchCard";
import { ResearchDetailDialog } from "@/components/classroom-research/ResearchDetailDialog";
import { EditResearchDialog } from "@/components/classroom-research/EditResearchDialog";
import type {
  ClassroomResearchSuggestion,
  ResearchStatus,
} from "@/types/classroomResearch";

export default function ClassroomResearch() {
  const { data: allResearch, isLoading, error } = useClassroomResearch();
  const { isTeacher, isAdmin, isLead, teacherId } = useUserRole();

  const [showAbandoned, setShowAbandoned] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [detailDialogResearch, setDetailDialogResearch] =
    useState<ClassroomResearchSuggestion | null>(null);
  const [editDialogResearch, setEditDialogResearch] =
    useState<ClassroomResearchSuggestion | null>(null);

  const isAdminOrLead = isAdmin || isLead;

  // Filter by teacher (admin/lead only)
  const filteredByTeacher = useMemo(() => {
    if (!allResearch) return [];
    if (!isAdminOrLead || selectedTeacher === "all") return allResearch;
    return allResearch.filter((r) => r.teacher_id === selectedTeacher);
  }, [allResearch, isAdminOrLead, selectedTeacher]);

  // Filter by abandoned toggle
  const visibleResearch = useMemo(() => {
    if (showAbandoned) return filteredByTeacher;
    return filteredByTeacher.filter((r) => r.status !== "abandoned");
  }, [filteredByTeacher, showAbandoned]);

  // Status counts (for admin/lead summary bar)
  const statusCounts = useMemo(() => {
    const counts: Record<ResearchStatus, number> = {
      suggested: 0,
      selected: 0,
      in_progress: 0,
      completed: 0,
      abandoned: 0,
    };
    filteredByTeacher.forEach((r) => {
      counts[r.status]++;
    });
    return counts;
  }, [filteredByTeacher]);

  // Unique teachers (for admin/lead dropdown)
  const teachers = useMemo(() => {
    if (!allResearch) return [];
    const teacherMap = new Map<string, string>();
    allResearch.forEach((r) => {
      if (!teacherMap.has(r.teacher_id)) {
        teacherMap.set(r.teacher_id, r.teacher_name || "ไม่ระบุชื่อ");
      }
    });
    return Array.from(teacherMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "th")
    );
  }, [allResearch]);

  // Check if current user can edit a research item
  const canEditResearch = (research: ClassroomResearchSuggestion) => {
    // Admin/lead can edit all, teachers can edit only their own
    return isAdminOrLead || research.teacher_id === teacherId;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileSearch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">วิจัยชั้นเรียน</h1>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-4 text-destructive text-sm">
              ไม่สามารถโหลดข้อมูลได้: {error.message}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <>
            {/* Admin/Lead Summary Bar */}
            {isAdminOrLead && (
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-indigo-900">
                    สรุปภาพรวม
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-blue-600">
                        {statusCounts.suggested}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        หัวข้อแนะนำ
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-yellow-600">
                        {statusCounts.selected}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        เลือกแล้ว
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-orange-600">
                        {statusCounts.in_progress}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        กำลังทำ
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-green-600">
                        {statusCounts.completed}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        เสร็จสมบูรณ์
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-gray-600">
                        {statusCounts.abandoned}
                      </div>
                      <div className="text-xs text-muted-foreground">ไม่ทำ</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="show-abandoned"
                  checked={showAbandoned}
                  onCheckedChange={setShowAbandoned}
                />
                <Label htmlFor="show-abandoned" className="cursor-pointer text-sm">
                  แสดงที่ไม่ทำ
                </Label>
              </div>

              {/* Teacher Filter (Admin/Lead only) */}
              {isAdminOrLead && teachers.length > 0 && (
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="กรองตามครู" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกคน ({allResearch?.length})</SelectItem>
                    {teachers.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Empty State */}
            {visibleResearch.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground gap-3">
                  <BookOpen className="h-12 w-12 opacity-40" />
                  <p className="text-center">
                    {showAbandoned && filteredByTeacher.length > 0
                      ? "ไม่มีหัวข้อที่ไม่ทำในขณะนี้"
                      : "ยังไม่มีหัวข้อแนะนำ — ระบบจะเสนอทุกต้นเดือน"}
                  </p>
                  {!showAbandoned && filteredByTeacher.some((r) => r.status === "abandoned") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAbandoned(true)}
                    >
                      แสดงหัวข้อที่ไม่ทำ
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Research Cards */}
            {visibleResearch.length > 0 && (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {visibleResearch.map((research) => (
                  <ResearchCard
                    key={research.id}
                    research={research}
                    showTeacherName={isAdminOrLead}
                    onViewDetail={setDetailDialogResearch}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <ResearchDetailDialog
        research={detailDialogResearch}
        open={!!detailDialogResearch}
        onClose={() => setDetailDialogResearch(null)}
        onEdit={setEditDialogResearch}
        canEdit={detailDialogResearch ? canEditResearch(detailDialogResearch) : false}
      />

      {/* Edit Dialog */}
      <EditResearchDialog
        research={editDialogResearch}
        open={!!editDialogResearch}
        onClose={() => setEditDialogResearch(null)}
      />
    </AppLayout>
  );
}

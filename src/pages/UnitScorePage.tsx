import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { Unit1Uploader } from "@/components/unit-score/Unit1Uploader";
import { UnitScoreEntry } from "@/components/unit-score/UnitScoreEntry";
import { UnitScoreImporter } from "@/components/unit-score/UnitScoreImporter";
import { UnitScoreAdminOverview } from "@/components/unit-score/UnitScoreAdminOverview";
import { Button } from "@/components/ui/button";
import { downloadUnitScoreTemplate } from "@/lib/unitScoreTemplate";
import { Download } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

export default function UnitScorePage() {
  const [importerOpen, setImporterOpen] = useState(false);
  const { isAdmin, isLead } = useUserRole();
  const isAdminOrLead = isAdmin || isLead;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">บันทึกคะแนนหน่วย</h1>
          <p className="text-muted-foreground mt-2">
            นำเข้ารายชื่อจาก Excel และบันทึกคะแนน K/P/A รายหน่วย
          </p>
        </div>

        <Tabs defaultValue="kpa-import" className="w-full">
          <TabsList className={`grid w-full ${isAdminOrLead ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="kpa-import">📊 นำเข้าคะแนน K/P/A</TabsTrigger>
            <TabsTrigger value="import">📤 นำเข้ารายชื่อ (Excel)</TabsTrigger>
            <TabsTrigger value="grid">📝 บันทึกคะแนน Grid</TabsTrigger>
            {isAdminOrLead && (
              <TabsTrigger value="admin-overview">📈 ภาพรวมผู้บริหาร</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="kpa-import" className="mt-6">
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium mb-1">สำหรับไฟล์ Template: <span className="font-semibold">แบบบันทึกคะแนนหลังหน่วยการเรียนรู้</span></p>
                <p className="text-sm text-muted-foreground mb-4">
                  นำเข้าคะแนน K (ความรู้), P (ทักษะ), A (เจตคติ) รายข้อจาก Excel ที่ครูกรอก
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => downloadUnitScoreTemplate()}>
                    <Download className="h-4 w-4 mr-2" />
                    ดาวน์โหลดเทมเพลต (.xlsx)
                  </Button>
                  <Button onClick={() => setImporterOpen(true)}>
                    📤 เลือกไฟล์และนำเข้า
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ครูดาวน์โหลดเทมเพลต → กรอกคะแนน → บันทึกเป็น .xlsx → นำเข้ากลับ
                </p>
              </div>
            </div>
            <UnitScoreImporter
              open={importerOpen}
              onOpenChange={setImporterOpen}
            />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <Unit1Uploader />
          </TabsContent>

          <TabsContent value="grid" className="mt-6">
            <UnitScoreEntry />
          </TabsContent>

          {isAdminOrLead && (
            <TabsContent value="admin-overview" className="mt-6">
              <UnitScoreAdminOverview />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

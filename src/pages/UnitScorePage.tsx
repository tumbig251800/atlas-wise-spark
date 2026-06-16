import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { Unit1Uploader } from "@/components/unit-score/Unit1Uploader";
import { UnitScoreEntry } from "@/components/unit-score/UnitScoreEntry";
import { UnitScoreImporter } from "@/components/unit-score/UnitScoreImporter";
import { Button } from "@/components/ui/button";

export default function UnitScorePage() {
  const [importerOpen, setImporterOpen] = useState(false);

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kpa-import">📊 นำเข้าคะแนน K/P/A</TabsTrigger>
            <TabsTrigger value="import">📤 นำเข้ารายชื่อ (Excel)</TabsTrigger>
            <TabsTrigger value="grid">📝 บันทึกคะแนน Grid</TabsTrigger>
          </TabsList>

          <TabsContent value="kpa-import" className="mt-6">
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium mb-1">สำหรับไฟล์ Template: <span className="font-semibold">แบบบันทึกคะแนนหลังหน่วยการเรียนรู้</span></p>
                <p className="text-sm text-muted-foreground mb-4">
                  นำเข้าคะแนน K (ความรู้), P (ทักษะ), A (เจตคติ) รายข้อจาก Excel ที่ครูกรอก
                </p>
                <Button onClick={() => setImporterOpen(true)}>
                  📤 เลือกไฟล์และนำเข้า
                </Button>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

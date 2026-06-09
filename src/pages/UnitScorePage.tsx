import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { Unit1Uploader } from "@/components/unit-score/Unit1Uploader";
import { UnitScoreEntry } from "@/components/unit-score/UnitScoreEntry";

export default function UnitScorePage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">บันทึกคะแนนหน่วย</h1>
          <p className="text-muted-foreground mt-2">
            นำเข้ารายชื่อจาก Excel และบันทึกคะแนน K/P/A รายหน่วย
          </p>
        </div>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">📤 นำเข้ารายชื่อ (Excel)</TabsTrigger>
            <TabsTrigger value="grid">📝 บันทึกคะแนน Grid</TabsTrigger>
          </TabsList>

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

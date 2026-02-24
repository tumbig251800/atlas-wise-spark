-- Run this in Supabase Dashboard → SQL Editor
-- แก้ error CSV import: เพิ่มคอลัมน์ทั้งหมดที่แอปใช้ (production schema ต่างจาก migrations)
-- ใช้กับ project ebyelctqcdhjmqujeskx

DO $$
BEGIN
  -- 1. สร้าง enum activity_mode ถ้ายังไม่มี
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_mode') THEN
    CREATE TYPE public.activity_mode AS ENUM ('active', 'passive', 'constructive');
  END IF;

  -- 2. สร้าง enum major_gap ถ้ายังไม่มี (ถ้ามีแล้ว ให้รัน ADD VALUE ด้านล่าง)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'major_gap') THEN
    CREATE TYPE public.major_gap AS ENUM ('k-gap', 'p-gap', 'a-gap', 'a2-gap', 'system-gap', 'success');
  END IF;

  -- 3. เพิ่มคอลัมน์ activity_mode ถ้ายังไม่มี
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'activity_mode') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN activity_mode public.activity_mode NOT NULL DEFAULT 'active';
  END IF;

  -- 4. total_students
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'total_students') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN total_students integer;
  END IF;

  -- 5. classroom_management
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'classroom_management') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN classroom_management TEXT DEFAULT 'เรียบร้อยดี';
  END IF;

  -- 6. learning_unit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'learning_unit') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN learning_unit TEXT DEFAULT '';
  END IF;

  -- 7. topic
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'topic') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN topic TEXT DEFAULT '';
  END IF;

  -- 8. mastery_score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'mastery_score') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN mastery_score INTEGER NOT NULL DEFAULT 3;
    ALTER TABLE public.teaching_logs ADD CONSTRAINT teaching_logs_mastery_score_check CHECK (mastery_score BETWEEN 1 AND 5);
  END IF;

  -- 9. key_issue
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'key_issue') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN key_issue TEXT DEFAULT '';
  END IF;

  -- 10. major_gap
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'major_gap') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN major_gap public.major_gap NOT NULL DEFAULT 'success';
  END IF;

  -- 11. health_care_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'health_care_status') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN health_care_status BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- 12. health_care_ids
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'health_care_ids') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN health_care_ids TEXT DEFAULT '';
  END IF;

  -- 13. remedial_ids
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'remedial_ids') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN remedial_ids TEXT DEFAULT '';
  END IF;

  -- 14. next_strategy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'next_strategy') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN next_strategy TEXT DEFAULT '';
  END IF;

  -- 15. reflection
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'reflection') THEN
    ALTER TABLE public.teaching_logs ADD COLUMN reflection TEXT DEFAULT '';
  END IF;
END $$;

-- เพิ่มค่าใน enum major_gap ถ้ายังไม่มี (ต้องรันนอก transaction)
ALTER TYPE public.major_gap ADD VALUE IF NOT EXISTS 'a2-gap';
ALTER TYPE public.major_gap ADD VALUE IF NOT EXISTS 'system-gap';

-- บังคับให้ PostgREST โหลด schema cache ใหม่ (แก้ error "Could not find column")
NOTIFY pgrst, 'reload schema';

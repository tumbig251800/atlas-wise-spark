-- Repair: เพิ่ม activity_mode, total_students, classroom_management ถ้ายังไม่มี
-- แก้ error CSV import: "Could not find activity_mode/classroom_management column"

DO $$
BEGIN
  -- 1. สร้าง enum activity_mode ถ้ายังไม่มี
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_mode') THEN
    CREATE TYPE public.activity_mode AS ENUM ('active', 'passive', 'constructive');
  END IF;

  -- 2. เพิ่มคอลัมน์ activity_mode ถ้ายังไม่มี
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'activity_mode'
  ) THEN
    ALTER TABLE public.teaching_logs
      ADD COLUMN activity_mode public.activity_mode NOT NULL DEFAULT 'active';
  END IF;

  -- 3. เพิ่มคอลัมน์ total_students ถ้ายังไม่มี
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'total_students'
  ) THEN
    ALTER TABLE public.teaching_logs ADD COLUMN total_students integer;
  END IF;

  -- 4. เพิ่มคอลัมน์ classroom_management ถ้ายังไม่มี
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teaching_logs' AND column_name = 'classroom_management'
  ) THEN
    ALTER TABLE public.teaching_logs
      ADD COLUMN classroom_management TEXT DEFAULT 'เรียบร้อยดี';
  END IF;

  -- 5. เพิ่มค่าใน enum major_gap ถ้ายังไม่มี (ป้องกัน error จากการใส่ a2-gap, system-gap)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'major_gap') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'major_gap' AND e.enumlabel = 'a2-gap') THEN
      ALTER TYPE public.major_gap ADD VALUE 'a2-gap';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'major_gap' AND e.enumlabel = 'system-gap') THEN
      ALTER TYPE public.major_gap ADD VALUE 'system-gap';
    END IF;
  END IF;
END $$;

-- บังคับให้ PostgREST โหลด schema cache ใหม่ (แก้ error "Could not find column")
NOTIFY pgrst, 'reload schema';

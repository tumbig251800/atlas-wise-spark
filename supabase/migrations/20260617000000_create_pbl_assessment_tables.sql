-- PBL Assessment System
-- Created: 2026-06-17
-- Purpose: Track Project-Based Learning assessments for students

-- ตาราง 1: โปรเจกต์ PBL
CREATE TABLE IF NOT EXISTS pbl_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name  TEXT NOT NULL,
  grade_level   TEXT NOT NULL,          -- เช่น ป.4
  classroom     TEXT NOT NULL,          -- เช่น KBW
  teacher_name  TEXT NOT NULL,
  academic_term TEXT NOT NULL,          -- เช่น 2568-2
  month         TEXT NOT NULL,          -- เช่น พฤศจิกายน
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one project per (name, grade, class, term)
  CONSTRAINT unique_pbl_project UNIQUE (project_name, grade_level, classroom, academic_term)
);

-- ตาราง 2: คะแนนรายนักเรียน
CREATE TABLE IF NOT EXISTS pbl_assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES pbl_projects(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL,
  student_name   TEXT,

  -- คะแนน 5 ด้านสมรรถนะ (1-3)
  com_score      SMALLINT CHECK (com_score >= 1 AND com_score <= 3),      -- การสื่อสาร
  think_score    SMALLINT CHECK (think_score >= 1 AND think_score <= 3),    -- การคิด
  problem_score  SMALLINT CHECK (problem_score >= 1 AND problem_score <= 3),  -- การแก้ปัญหา
  life_score     SMALLINT CHECK (life_score >= 1 AND life_score <= 3),     -- ทักษะชีวิต
  tech_score     SMALLINT CHECK (tech_score >= 1 AND tech_score <= 3),     -- เทคโนโลยี

  -- คำนวณคะแนนรวมอัตโนมัติ
  total_score    SMALLINT GENERATED ALWAYS AS
                 (com_score + think_score + problem_score + life_score + tech_score) STORED,

  overall_result TEXT CHECK (overall_result IN ('excellent','pass','fail')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one assessment per (project, student)
  CONSTRAINT unique_pbl_assessment UNIQUE (project_id, student_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pbl_projects_term ON pbl_projects(academic_term);
CREATE INDEX IF NOT EXISTS idx_pbl_projects_class ON pbl_projects(grade_level, classroom);
CREATE INDEX IF NOT EXISTS idx_pbl_projects_teacher ON pbl_projects(teacher_name);
CREATE INDEX IF NOT EXISTS idx_pbl_assessments_proj ON pbl_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_pbl_assessments_stud ON pbl_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_pbl_assessments_result ON pbl_assessments(overall_result);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_pbl_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pbl_projects_timestamp
  BEFORE UPDATE ON pbl_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_pbl_timestamp();

CREATE TRIGGER update_pbl_assessments_timestamp
  BEFORE UPDATE ON pbl_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_pbl_timestamp();

-- Comments for documentation
COMMENT ON TABLE pbl_projects IS 'PBL projects - one per month per class';
COMMENT ON TABLE pbl_assessments IS 'Student competency scores for each PBL project';
COMMENT ON COLUMN pbl_assessments.com_score IS 'Communication competency (1-3)';
COMMENT ON COLUMN pbl_assessments.think_score IS 'Thinking competency (1-3)';
COMMENT ON COLUMN pbl_assessments.problem_score IS 'Problem-solving competency (1-3)';
COMMENT ON COLUMN pbl_assessments.life_score IS 'Life skills competency (1-3)';
COMMENT ON COLUMN pbl_assessments.tech_score IS 'Technology competency (1-3)';
COMMENT ON COLUMN pbl_assessments.overall_result IS 'Overall result: excellent (no 1s, 3+ threes) | fail (any 1) | pass (otherwise)';

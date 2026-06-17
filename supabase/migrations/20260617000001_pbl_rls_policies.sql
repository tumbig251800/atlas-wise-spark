-- RLS Policies for PBL Assessment Tables
-- Created: 2026-06-17
-- Purpose: Row Level Security for pbl_projects and pbl_assessments

-- Enable RLS
ALTER TABLE pbl_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbl_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Teachers can view PBL projects" ON pbl_projects;
DROP POLICY IF EXISTS "Teachers can manage PBL projects" ON pbl_projects;
DROP POLICY IF EXISTS "Teachers can view PBL assessments" ON pbl_assessments;
DROP POLICY IF EXISTS "Teachers can manage PBL assessments" ON pbl_assessments;

-- pbl_projects policies

-- SELECT: teacher, director, lead can view all projects
CREATE POLICY "Teachers can view PBL projects"
ON pbl_projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- INSERT: teacher, director, lead can create projects
CREATE POLICY "Teachers can insert PBL projects"
ON pbl_projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- UPDATE: teacher, director, lead can update projects
CREATE POLICY "Teachers can update PBL projects"
ON pbl_projects FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- DELETE: only director can delete projects
CREATE POLICY "Directors can delete PBL projects"
ON pbl_projects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'director'
  )
);

-- pbl_assessments policies

-- SELECT: teacher, director, lead can view all assessments
CREATE POLICY "Teachers can view PBL assessments"
ON pbl_assessments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- INSERT: teacher, director, lead can create assessments
CREATE POLICY "Teachers can insert PBL assessments"
ON pbl_assessments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- UPDATE: teacher, director, lead can update assessments
CREATE POLICY "Teachers can update PBL assessments"
ON pbl_assessments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'director', 'lead')
  )
);

-- DELETE: only director can delete assessments
CREATE POLICY "Directors can delete PBL assessments"
ON pbl_assessments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'director'
  )
);

-- Comments
COMMENT ON POLICY "Teachers can view PBL projects" ON pbl_projects IS 'Allow teachers, directors, and leads to view all PBL projects';
COMMENT ON POLICY "Teachers can insert PBL projects" ON pbl_projects IS 'Allow teachers, directors, and leads to create PBL projects';
COMMENT ON POLICY "Teachers can update PBL projects" ON pbl_projects IS 'Allow teachers, directors, and leads to update PBL projects';
COMMENT ON POLICY "Directors can delete PBL projects" ON pbl_projects IS 'Only directors can delete PBL projects';

COMMENT ON POLICY "Teachers can view PBL assessments" ON pbl_assessments IS 'Allow teachers, directors, and leads to view all PBL assessments';
COMMENT ON POLICY "Teachers can insert PBL assessments" ON pbl_assessments IS 'Allow teachers, directors, and leads to create PBL assessments';
COMMENT ON POLICY "Teachers can update PBL assessments" ON pbl_assessments IS 'Allow teachers, directors, and leads to update PBL assessments';
COMMENT ON POLICY "Directors can delete PBL assessments" ON pbl_assessments IS 'Only directors can delete PBL assessments';

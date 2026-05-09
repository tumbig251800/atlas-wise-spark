import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { TeacherProfile } from "../contract.ts";

export async function getTeacherProfiles(
  supabase: ReturnType<typeof createClient>,
  filters: { teacherIds?: string[] }
): Promise<{ teachers: TeacherProfile[] }> {
  let query = supabase
    .from("profiles")
    .select("user_id, full_name, teacher_code")
    .order("full_name");

  if (filters.teacherIds?.length) {
    query = query.in("user_id", filters.teacherIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`get_teacher_profiles: ${error.message}`);

  const teachers: TeacherProfile[] = (data || []).map((row) => ({
    id: row.user_id,
    full_name: row.full_name,
    teacher_code: row.teacher_code,
  }));

  return { teachers };
}

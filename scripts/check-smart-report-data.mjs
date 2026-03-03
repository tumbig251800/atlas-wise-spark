#!/usr/bin/env node
/**
 * Check teaching_logs and unit_assessments for Smart Report filter ภาษาไทย, ป.4, ห้อง2/2
 * Run: node scripts/check-smart-report-data.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = "https://ebyelctqcdhjmqujeskx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

const supabase = createClient(url, key);

async function main() {
  console.log("=== Smart Report Data Check ===\n");
  console.log("Note: Using anon key - RLS may restrict to auth user. Logged-in app sees user's data.\n");

  // 0. Sample of ALL teaching_logs (to see what exists - RLS may block)
  const { data: allLogs, error: e0 } = await supabase
    .from("teaching_logs")
    .select("subject,grade_level,classroom,academic_term")
    .limit(100);
  if (e0) console.error("All logs error:", e0);
  else {
    const subjects = [...new Set((allLogs ?? []).map((r) => r.subject))];
    const grades = [...new Set((allLogs ?? []).map((r) => r.grade_level))];
    const rooms = [...new Set((allLogs ?? []).map((r) => r.classroom))];
    const terms = [...new Set((allLogs ?? []).map((r) => r.academic_term).filter(Boolean))];
    console.log(`teaching_logs total visible (anon): ${allLogs?.length ?? 0}`);
    console.log("  subjects:", subjects.slice(0, 5).join(", ") || "none");
    console.log("  grade_levels:", grades.slice(0, 5).join(", ") || "none");
    console.log("  classrooms:", rooms.slice(0, 10).join(", ") || "none");
    console.log("  academic_terms:", terms.slice(0, 5).join(", ") || "none");
    console.log();
  }

  // 1. All teaching_logs for ภาษาไทย, ป.4 (any classroom)
  const { data: logsAll, error: e1 } = await supabase
    .from("teaching_logs")
    .select("id,teaching_date,subject,grade_level,classroom,academic_term,learning_unit")
    .eq("subject", "ภาษาไทย")
    .eq("grade_level", "ป.4");

  if (e1) {
    console.error("Error fetching logs:", e1);
    return;
  }

  console.log(`teaching_logs (ภาษาไทย, ป.4) total: ${logsAll?.length ?? 0}`);
  if (logsAll?.length) {
    const classrooms = [...new Set(logsAll.map((r) => r.classroom))];
    const terms = [...new Set(logsAll.map((r) => r.academic_term).filter(Boolean))];
    const units = [...new Set(logsAll.map((r) => r.learning_unit).filter(Boolean))];
    console.log("  classrooms:", classrooms.join(", "));
    console.log("  academic_terms:", terms.join(", ") || "(null/empty)");
    console.log("  learning_units (sample):", units.slice(0, 8).join(" | "));
  }

  // 2. Filter classroom = "2" OR "ห้อง2"
  const classroom2 = logsAll?.filter((r) => String(r.classroom) === "2" || r.classroom === "ห้อง2") ?? [];
  console.log(`\n  classroom 2 or ห้อง2: ${classroom2.length} rows`);

  // 3. academic_term 2568-2 or 2569-2
  const term25682 = logsAll?.filter((r) => r.academic_term === "2568-2") ?? [];
  const term25692 = logsAll?.filter((r) => r.academic_term === "2569-2") ?? [];
  console.log(`  academic_term 2568-2: ${term25682.length} rows`);
  console.log(`  academic_term 2569-2: ${term25692.length} rows`);

  // 4. Full Smart Report filter: subject=ภาษาไทย, grade=ป.4, classroom=2, term=2568-2
  const { data: filtered, error: e2 } = await supabase
    .from("teaching_logs")
    .select("id,teaching_date,classroom,academic_term,learning_unit,major_gap,mastery_score")
    .eq("subject", "ภาษาไทย")
    .eq("grade_level", "ป.4")
    .eq("classroom", "2")
    .eq("academic_term", "2568-2");

  if (e2) console.error("Filter error:", e2);
  else {
    console.log(`\n[Filter: ภาษาไทย, ป.4, classroom=2, academic_term=2568-2]: ${filtered?.length ?? 0} rows`);
    if (filtered?.length) {
      filtered.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.teaching_date} | ${r.learning_unit} | ${r.major_gap} | ${r.mastery_score}`);
      });
    }
  }

  // 5. Try classroom "ห้อง2"
  const { data: filteredRoom2, error: e3 } = await supabase
    .from("teaching_logs")
    .select("id,teaching_date,learning_unit")
    .eq("subject", "ภาษาไทย")
    .eq("grade_level", "ป.4")
    .eq("classroom", "ห้อง2")
    .eq("academic_term", "2568-2");

  if (e3) console.error("Filter (ห้อง2) error:", e3);
  else {
    console.log(`\n[Filter with classroom=ห้อง2, term=2568-2]: ${filteredRoom2?.length ?? 0} rows`);
  }

  // 6. unit_assessments
  const { data: assess, error: e4 } = await supabase
    .from("unit_assessments")
    .select("id,student_id,unit_name,score,total_score")
    .eq("subject", "ภาษาไทย")
    .eq("grade_level", "ป.4");

  if (e4) console.error("unit_assessments error:", e4);
  else {
    console.log(`\nunit_assessments (ภาษาไทย, ป.4): ${assess?.length ?? 0} rows`);
  }
}

main();

import { useState, useCallback } from "react";
import { supabase } from "@/lib/atlasSupabase";
import type { NidetVisit, NidetVisitInsert } from "@/types/nidet";

// DB text columns are nullable (default ''); normalize to non-null strings so
// the rest of the app can rely on the NidetVisit interface.
type NidetRow = {
  id: string;
  action_item_id: number;
  visit_date: string;
  supervisor_id: string | null;
  supervisor_name: string;
  strengths: string | null;
  improvements: string | null;
  recommendations: string | null;
  follow_up_date: string | null;
  follow_up_method: string | null;
  rubric_activity_design: number | null;
  rubric_questioning: number | null;
  rubric_media_tech: number | null;
  rubric_individual_care: number | null;
  rubric_collaborative: number | null;
  rubric_formative_assess: number | null;
  rubric_feedback: number | null;
  rubric_classroom_climate: number | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: NidetRow): NidetVisit {
  return {
    ...row,
    strengths: row.strengths ?? "",
    improvements: row.improvements ?? "",
    recommendations: row.recommendations ?? "",
    follow_up_method: row.follow_up_method ?? "",
  };
}

export function useNidetVisits() {
  const [visit, setVisit] = useState<NidetVisit | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch the latest visit for a given action item.
  const fetchVisit = useCallback(async (actionItemId: number): Promise<NidetVisit | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nidet_visits")
        .select("*")
        .eq("action_item_id", actionItemId)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const mapped = data ? mapRow(data as NidetRow) : null;
      setVisit(mapped);
      return mapped;
    } finally {
      setLoading(false);
    }
  }, []);

  // Insert a new visit, or update the existing one for this action item.
  const saveVisit = useCallback(async (input: NidetVisitInsert): Promise<NidetVisit> => {
    setSaving(true);
    try {
      const { data: existing, error: findErr } = await supabase
        .from("nidet_visits")
        .select("id")
        .eq("action_item_id", input.action_item_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;

      const now = new Date().toISOString();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("nidet_visits")
          .update({ ...input, updated_at: now })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        const mapped = mapRow(data as NidetRow);
        setVisit(mapped);
        return mapped;
      }

      const { data, error } = await supabase
        .from("nidet_visits")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      const mapped = mapRow(data as NidetRow);
      setVisit(mapped);
      return mapped;
    } finally {
      setSaving(false);
    }
  }, []);

  return { visit, loading, saving, fetchVisit, saveVisit };
}

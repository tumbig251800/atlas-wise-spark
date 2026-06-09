import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";

export interface UserRole {
  /** profiles.role value ('teacher' | 'admin' | 'super_admin' | 'lead'), or null while unknown. */
  role: string | null;
  isAdmin: boolean;
  isLead: boolean;
  isTeacher: boolean;
  /** The user's auth id — used as action_plan_items.teacher_id. */
  teacherId: string | null;
  teacherName: string | null;
  loading: boolean;
}

interface ProfileRow {
  role: string | null;
  full_name: string | null;
  user_id: string;
}

/**
 * Resolves the current user's role for the Action Board.
 *
 * Bridges the two role systems in this codebase:
 *  - the legacy `user_roles` table ('teacher' | 'director'), surfaced via useAuth(),
 *  - the newer `profiles.role` ('teacher' | 'admin' | 'super_admin').
 *
 * A 'director' in user_roles is treated as admin so existing directors keep full
 * access without needing a profiles.role update.
 */
export function useUserRole(): UserRole {
  const { user, role: appRole, loading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile-role", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name, user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const profileRole = profile?.role ?? null;

  const isAdmin =
    appRole === "director" ||
    profileRole === "admin" ||
    profileRole === "super_admin";
  const isLead = profileRole === "lead";
  const isTeacher = !!user && !isAdmin && !isLead;

  return {
    role: profileRole,
    isAdmin,
    isLead,
    isTeacher,
    teacherId: user?.id ?? null,
    teacherName:
      profile?.full_name ??
      (user?.user_metadata?.full_name as string | undefined) ??
      null,
    loading: authLoading || (!!user?.id && profileLoading),
  };
}

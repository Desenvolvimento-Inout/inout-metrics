import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserControlRow = Tables<"user_control">;

export function useUserControl() {
  const [userControl, setUserControl] = useState<UserControlRow | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureAndFetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserControl(null);
      setLoading(false);
      return null;
    }

    const { data: existing } = await supabase
      .from("user_control")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setUserControl(existing);
      setLoading(false);
      return existing;
    }

    const { data: inserted, error } = await supabase
      .from("user_control")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        role: "user",
        approved: false,
      })
      .select()
      .single();

    if (error) {
      setUserControl(null);
      setLoading(false);
      return null;
    }
    setUserControl(inserted);
    setLoading(false);
    return inserted;
  }, []);

  useEffect(() => {
    ensureAndFetch();
  }, [ensureAndFetch]);

  const isAdmin = userControl?.role === "admin";
  const canAccessApp = isAdmin || (userControl?.approved === true);

  return {
    userControl,
    loading,
    refetch: ensureAndFetch,
    role: (userControl?.role ?? "user") as "admin" | "user",
    approved: userControl?.approved ?? false,
    approved_by: userControl?.approved_by ?? null,
    isAdmin,
    canAccessApp,
  };
}

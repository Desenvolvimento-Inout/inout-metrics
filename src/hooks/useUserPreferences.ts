import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPreferences {
  id?: string;
  user_id?: string;
  show_conversas: boolean;
  show_conversoes: boolean;
  show_qualificados: boolean;
  show_desqualificados: boolean;
}

const defaultPreferences: UserPreferences = {
  show_conversas: true,
  show_conversoes: true,
  show_qualificados: true,
  show_desqualificados: true,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching preferences:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setPreferences({
        id: data.id,
        user_id: data.user_id,
        show_conversas: data.show_conversas,
        show_conversoes: data.show_conversoes,
        show_qualificados: data.show_qualificados,
        show_desqualificados: data.show_desqualificados,
      });
    }

    setLoading(false);
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setSaving(false);
      return { error: "Usuário não autenticado" };
    }

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    let error;

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_preferences")
        .update({
          show_conversas: newPreferences.show_conversas,
          show_conversoes: newPreferences.show_conversoes,
          show_qualificados: newPreferences.show_qualificados,
          show_desqualificados: newPreferences.show_desqualificados,
        })
        .eq("user_id", session.user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: session.user.id,
          show_conversas: newPreferences.show_conversas,
          show_conversoes: newPreferences.show_conversoes,
          show_qualificados: newPreferences.show_qualificados,
          show_desqualificados: newPreferences.show_desqualificados,
        });
      error = insertError;
    }

    setSaving(false);
    
    if (error) {
      console.error("Error saving preferences:", error);
      return { error: error.message };
    }

    return { error: null };
  }, [preferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    fetchPreferences,
  };
}

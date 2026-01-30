import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Integration {
  id: string;
  user_id: string;
  project_url: string;
  anon_key: string;
  selected_table: string | null;
  created_at: string;
  updated_at: string;
}

export function useIntegration() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegration = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setIntegration(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar integração";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveIntegration = async (config: {
    projectUrl: string;
    anonKey: string;
    selectedTable?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const integrationData = {
        user_id: user.id,
        project_url: config.projectUrl,
        anon_key: config.anonKey,
        selected_table: config.selectedTable || null,
      };

      // Check if integration already exists
      const { data: existing } = await supabase
        .from("user_integrations")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from("user_integrations")
          .update(integrationData)
          .eq("user_id", user.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from("user_integrations")
          .insert(integrationData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setIntegration(result.data);
      return { data: result.data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar integração";
      return { data: null, error: message };
    }
  };

  const deleteIntegration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error: deleteError } = await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setIntegration(null);
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover integração";
      return { error: message };
    }
  };

  useEffect(() => {
    fetchIntegration();
  }, []);

  return {
    integration,
    loading,
    error,
    fetchIntegration,
    saveIntegration,
    deleteIntegration,
  };
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, UserCheck, UserX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { useUserControl } from "@/hooks/useUserControl";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type UserControlRow = Tables<"user_control">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(row: UserControlRow): "Aprovado" | "Pendente" | "Bloqueado" {
  if (row.approved) return "Aprovado";
  return row.approved_by ? "Bloqueado" : "Pendente";
}

export default function AdminControl() {
  const navigate = useNavigate();
  const { isAdmin, loading: ucLoading, userControl } = useUserControl();
  const [users, setUsers] = useState<UserControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_control")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
      return;
    }
    setUsers(data ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!ucLoading && !isAdmin) {
      navigate("/dashboard");
      return;
    }
    if (isAdmin) {
      setLoading(true);
      fetchUsers().finally(() => setLoading(false));
    }
  }, [ucLoading, isAdmin, navigate, fetchUsers]);

  const handleAction = async (userId: string, approve: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const by = user?.email ?? user?.id ?? "—";

    setActingId(userId);
    const { error } = await supabase
      .from("user_control")
      .update({ approved: approve, approved_by: by })
      .eq("user_id", userId);

    setActingId(null);
    if (error) {
      toast({ title: approve ? "Erro ao aprovar" : "Erro ao bloquear", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approve ? "Acesso aprovado" : "Acesso bloqueado", description: "Alteração aplicada." });
    fetchUsers();
  };

  if (ucLoading || (!isAdmin && !users.length)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header showLogout title="Inout Metrics" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLogout title="Inout Metrics" />
      <div className="glow-effect" />
      <main className="flex-1 container py-8 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Admin Control</h1>
                <p className="text-sm text-muted-foreground">Libere ou bloqueie o acesso ao dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>

          <div className="metric-card overflow-hidden p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Data de cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((row) => {
                    const status = statusLabel(row);
                    const isOwn = row.user_id === userControl?.user_id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === "Aprovado" ? "default" : status === "Bloqueado" ? "destructive" : "secondary"
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.approved_by ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {row.role === "admin" ? (
                            <span className="text-xs text-muted-foreground">Admin</span>
                          ) : isOwn ? (
                            <span className="text-xs text-muted-foreground">Você</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-success border-success/50 hover:bg-success/10"
                                onClick={() => handleAction(row.user_id, true)}
                                disabled={actingId !== null}
                              >
                                {actingId === row.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5" />
                                )}
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={() => handleAction(row.user_id, false)}
                                disabled={actingId !== null}
                              >
                                {actingId === row.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserX className="h-3.5 w-3.5" />
                                )}
                                Bloquear
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!loading && users.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">Nenhum usuário cadastrado.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

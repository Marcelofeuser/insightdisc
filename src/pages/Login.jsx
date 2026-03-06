import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [loading, setLoading] = useState(false);

  const quickLogin = async (email) => {
    setLoading(true);
    try {
      if (typeof base44.auth.login === "function") {
        await base44.auth.login({ email });
      } else {
        throw new Error("Login não suportado no provider atual.");
      }
      await checkAppState();
      navigate(createPageUrl("Dashboard"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Entrar</h1>
          <p className="text-slate-600 text-sm">
            Escolha como deseja acessar a plataforma.
          </p>

          <div className="grid gap-3">
            <Button disabled={loading} onClick={() => quickLogin("admin@example.com")}>
              Entrar como Admin
            </Button>
            <Button disabled={loading} variant="outline" onClick={() => quickLogin("pro@example.com")}>
              Entrar como Profissional
            </Button>
            <Button disabled={loading} variant="outline" onClick={() => quickLogin("user@example.com")}>
              Entrar como Usuário
            </Button>
            <Button disabled={loading} variant="outline" onClick={() => navigate(createPageUrl("StartFree"))}>
              Fazer meu teste DISC
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { setFreeLead } from "@/modules/freeLead/freeLeadStorage";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function StartFree() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lgpd, setLgpd] = useState(false);

  const canContinue = useMemo(() => {
    return name.trim().length >= 2 && isValidEmail(email) && lgpd;
  }, [name, email, lgpd]);

  const compareContext = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const compareWith = String(params.get("compareWith") || "").trim();
    const relation = String(params.get("relation") || "").trim();
    const fromName = String(params.get("fromName") || "").trim();
    if (!compareWith) return null;
    return { compareWith, relation, fromName };
  }, [location.search]);

  const go = () => {
    if (!canContinue) {
      toast({
        title: "Confira seus dados",
        description: "Informe nome, e-mail válido e aceite a LGPD para continuar.",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    setFreeLead({ name: trimmedName, email: trimmedEmail, consent: true });

    const params = new URLSearchParams();
    params.set("name", trimmedName);
    params.set("email", trimmedEmail);
    if (compareContext?.compareWith) {
      params.set("compareWith", compareContext.compareWith);
      if (compareContext.relation) params.set("relation", compareContext.relation);
      if (compareContext.fromName) params.set("fromName", compareContext.fromName);
    }

    navigate(`${createPageUrl("FreeAssessment")}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Teste DISC grátis</h1>
            <p className="text-slate-600 text-sm">
              Informe seus dados para gerar seu resultado e permitir compartilhar o link do relatório.
            </p>
            {compareContext ? (
              <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                Você está entrando em um convite de comparação de perfil
                {compareContext.fromName ? ` enviado por ${compareContext.fromName}` : ''}.
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox checked={lgpd} onCheckedChange={(v) => setLgpd(Boolean(v))} />
              <div className="text-sm text-slate-700 leading-relaxed">
                <p className="font-medium">Consentimento LGPD</p>
                <p className="text-slate-600">
                  Você autoriza o uso dos dados para gerar seu relatório DISC e contato sobre o resultado.
                  Você pode solicitar exclusão a qualquer momento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
              Voltar
            </Button>
            <Button onClick={go} disabled={!canContinue} className="bg-indigo-600 hover:bg-indigo-700">
              Começar teste
            </Button>
          </div>

          <div className="text-right">
            <Link to={createPageUrl("Login")} className="text-xs text-slate-500 hover:text-slate-700">
              Já tenho login → Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lgpd, setLgpd] = useState(false);

  const canContinue = useMemo(() => {
    return name.trim().length >= 2 && isValidEmail(email) && lgpd;
  }, [name, email, lgpd]);

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

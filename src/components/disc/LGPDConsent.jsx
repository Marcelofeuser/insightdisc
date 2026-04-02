import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';

export default function LGPDConsent({ onAccept, onDecline }) {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cfpAccepted, setCfpAccepted] = useState(false);

  const allAccepted = privacyAccepted && termsAccepted && cfpAccepted;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Privacidade e Consentimento</h2>
          </div>
          <p className="text-indigo-100 text-sm">
            Em conformidade com a LGPD (Lei 13.709/2018)
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* CFP Disclaimer */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Aviso Importante (CFP)</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  A avaliação DISC é uma <strong>ferramenta de mapeamento comportamental</strong> e 
                  <strong> não constitui diagnóstico clínico psicológico</strong>. Os resultados 
                  destinam-se a fins de autoconhecimento e desenvolvimento profissional, 
                  não devendo substituir avaliação psicológica realizada por profissional habilitado 
                  inscrito no Conselho Federal de Psicologia.
                </p>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={setPrivacyAccepted}
                className="mt-0.5"
              />
              <label htmlFor="privacy" className="text-sm text-slate-700 cursor-pointer">
                Li e aceito a{' '}
                <Link to={createPageUrl('Privacy')} className="text-indigo-600 underline hover:text-indigo-800 inline-flex items-center gap-1">
                  Política de Privacidade
                  <ExternalLink className="w-3 h-3" />
                </Link>{' '}
                e autorizo o tratamento dos meus dados pessoais conforme a LGPD para fins 
                de aplicação e análise da avaliação comportamental.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer">
                Li e aceito os{' '}
                <Link to={createPageUrl('Terms')} className="text-indigo-600 underline hover:text-indigo-800 inline-flex items-center gap-1">
                  Termos de Uso
                  <ExternalLink className="w-3 h-3" />
                </Link>{' '}
                da plataforma.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="cfp"
                checked={cfpAccepted}
                onCheckedChange={setCfpAccepted}
                className="mt-0.5"
              />
              <label htmlFor="cfp" className="text-sm text-slate-700 cursor-pointer">
                Compreendo que esta avaliação é uma ferramenta comportamental e{' '}
                <strong>não substitui avaliação psicológica clínica</strong>, conforme 
                diretrizes do CFP.
              </label>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
            <strong>Seus direitos (LGPD):</strong> Você pode solicitar acesso, correção, portabilidade 
            ou exclusão dos seus dados a qualquer momento via <a href="mailto:suporte@insightdisc.com" className="underline">suporte@insightdisc.com</a>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 rounded-xl"
            >
              Não aceito
            </Button>
            <Button
              onClick={onAccept}
              disabled={!allAccepted}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aceitar e Continuar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function CFPDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 mt-4">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span>
          Esta avaliação DISC é uma ferramenta de mapeamento comportamental e não constitui 
          diagnóstico clínico psicológico (CFP).
        </span>
      </div>
    );
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mt-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Aviso Legal — Conselho Federal de Psicologia (CFP)
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            A metodologia DISC utilizada neste relatório é uma <strong>ferramenta de mapeamento 
            comportamental</strong> para fins de autoconhecimento e desenvolvimento profissional. 
            Os resultados <strong>não constituem diagnóstico clínico psicológico</strong> e não 
            substituem a avaliação realizada por psicólogo devidamente habilitado e inscrito no CFP. 
            Para questões de saúde mental, consulte um profissional qualificado.
          </p>
        </div>
      </div>
    </div>
  );
}

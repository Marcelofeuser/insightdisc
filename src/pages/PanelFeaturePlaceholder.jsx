import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const FEATURE_COPY = {
  arquetipos: {
    title: 'Arquétipos DISC',
    description:
      'Arquétipos comportamentais com evolução contínua de conteúdo, voltados para leitura técnica e recomendações acionáveis nos planos Profissional, Business e Diamond.',
  },
  'biblioteca-disc': {
    title: 'Biblioteca DISC',
    description:
      'Biblioteca DISC aplicada, com conteúdo técnico em expansão contínua para interpretação avançada e aplicação prática nos planos Profissional, Business e Diamond.',
  },
  'meu-desenvolvimento': {
    title: 'Meu Desenvolvimento',
    description:
      'Estruture metas de evolução pessoal com base no seu perfil e no histórico de avaliações.',
  },
  historico: {
    title: 'Histórico Pessoal',
    description:
      'Visualize sua trilha de avaliações e compare variações comportamentais ao longo do tempo.',
  },
};

export default function PanelFeaturePlaceholder() {
  const { featureSlug = '' } = useParams();
  const key = String(featureSlug || '').trim().toLowerCase();
  const content =
    FEATURE_COPY[key] || {
      title: 'Área em evolução',
      description:
        'Estamos consolidando esta experiência no painel V2. Enquanto isso, use os módulos atuais sem interrupção.',
    };

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto px-6 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Painel V2</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{content.title}</h2>
        <p className="mt-3 text-sm text-slate-600">{content.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/painel">
            <Button className="bg-indigo-600 hover:bg-indigo-700">Voltar para o painel</Button>
          </Link>
          <Link to="/MyAssessments">
            <Button variant="outline">Abrir avaliações</Button>
          </Link>
          <Link to="/compare-profiles">
            <Button variant="outline">Comparar perfis</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

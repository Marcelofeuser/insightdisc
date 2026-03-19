import React from 'react';
import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function ReportLegacyPage() {
  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <EmptyState
        icon={FileSearch}
        title="Link legado desativado"
        description="O acesso público ao relatório agora exige token em /c/report?token=... e o download oficial usa /api/report/pdf?token=...."
        tone="soft"
      />
      <div className="mt-4 flex justify-center">
        <Link to="/MyAssessments">
          <Button variant="outline">Abrir avaliações</Button>
        </Link>
      </div>
    </div>
  );
}

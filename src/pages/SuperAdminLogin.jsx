import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSuperAdminLogin = async () => {
    setLoading(true);
    try {
      await base44.auth.login({ email: 'superadmin@example.com' });
      await checkAppState();
      navigate(createPageUrl('AdminDashboard'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Acesso da Plataforma</h1>
          <p className="text-slate-600 text-sm">
            Acesso restrito para administração global da plataforma.
          </p>

          <div className="grid gap-3">
            <Button disabled={loading} onClick={handleSuperAdminLogin}>
              Entrar na Administração Global
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

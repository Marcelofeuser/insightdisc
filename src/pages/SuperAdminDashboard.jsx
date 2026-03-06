import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Building2, Users, FileText, FileBarChart2, LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    users: 0,
    organizations: 0,
    assessments: 0,
    reports: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadOverview() {
      setLoading(true);
      setError('');
      try {
        const payload = await apiRequest('/super-admin/overview', {
          method: 'GET',
          requireAuth: true,
        });

        if (!mounted) return;
        setMetrics({
          users: Number(payload?.metrics?.users || 0),
          organizations: Number(payload?.metrics?.organizations || 0),
          assessments: Number(payload?.metrics?.assessments || 0),
          reports: Number(payload?.metrics?.reports || 0),
        });
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.payload?.error || loadError?.message || 'Falha ao carregar dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Painel restrito</p>
            <h1 className="text-2xl font-semibold text-slate-900">Super Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/Dashboard')}>
              Voltar ao app
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                logout(false);
                navigate('/super-admin-login', { replace: true });
              }}
              className="text-slate-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card className="border-indigo-100 bg-indigo-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <ShieldCheck className="w-5 h-5" />
              Sessão super admin validada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-indigo-900 space-y-1">
            <p>
              <strong>Usuário:</strong> {user?.name || user?.email || 'Super Admin'}
            </p>
            <p>
              <strong>E-mail:</strong> {user?.email || '-'}
            </p>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Usuários" value={loading ? '...' : metrics.users} />
          <StatCard icon={Building2} label="Workspaces" value={loading ? '...' : metrics.organizations} />
          <StatCard icon={FileText} label="Avaliações" value={loading ? '...' : metrics.assessments} />
          <StatCard icon={FileBarChart2} label="Relatórios" value={loading ? '...' : metrics.reports} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Acesso exclusivo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              Este ambiente exige autenticação dedicada de super admin com chave administrativa.
            </p>
            <p>
              O login público padrão não possui escopo para entrar nesta área.
            </p>
            <p>
              Para operações de tenant e produto, use o console em{' '}
              <Link className="text-indigo-700 hover:text-indigo-800" to="/AdminDashboard">
                /AdminDashboard
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

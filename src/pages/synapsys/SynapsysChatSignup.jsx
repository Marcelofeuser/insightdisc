import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, LockKeyhole, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { provisionSynapsysFreeAccess } from '@/lib/synapsysApi';
import { apiRequest, getApiBaseUrl, setApiSession } from '@/lib/apiClient';
import { mapAuthRequestError, submitAuthRequest } from '@/modules/auth/authApi';
import { sanitizeNextPath } from '@/modules/auth/next-path';
import {
  hasSynapsysAccess,
  mergeSynapsysAccessIntoUser,
} from '@/modules/synapsys/access';
import SynapsysSiteShell from '@/modules/synapsys/components/SynapsysSiteShell';
import {
  buildSynapsysEntryPath,
  buildSynapsysPricingPath,
} from '@/modules/synapsys/routes';
import {
  normalizeSynapsysIntent,
  persistSynapsysIntent,
  resolveSynapsysAuthDestination,
} from '@/modules/synapsys/session';

function normalizeSignupError(error) {
  const message = error?.payload?.error || error?.message || 'Falha ao criar conta.';
  if (message.toLowerCase().includes('já cadastrado')) {
    return 'Este e-mail já está em uso. Tente entrar com a conta existente.';
  }
  return message;
}

function normalizeSynapsysSetupError(error) {
  return error?.message || 'Não foi possível preparar o acesso da Synapsys agora.';
}

export default function SynapsysChatSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isAuthenticated,
    isLoadingAuth,
    access,
    user,
    applyAuthenticatedUser,
    checkAppState,
  } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const authFlowLockRef = useRef(false);
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const intent = useMemo(
    () => normalizeSynapsysIntent(searchParams.get('intent') || 'free'),
    [searchParams],
  );
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next'), ''),
    [searchParams],
  );

  useEffect(() => {
    persistSynapsysIntent(intent);
  }, [intent]);

  useEffect(() => {
    let cancelled = false;

    async function finalizeAuthenticatedFlow() {
      if (isLoadingAuth || !isAuthenticated || authFlowLockRef.current) return;

      authFlowLockRef.current = true;
      setLoading(true);
      setError('');

      try {
        let resolvedUser = user || null;

        if (intent === 'free' && !hasSynapsysAccess(resolvedUser, access)) {
          const provision = await provisionSynapsysFreeAccess();
          if (cancelled) return;

          if (resolvedUser) {
            resolvedUser = mergeSynapsysAccessIntoUser(resolvedUser, provision.synapsysAccess);
            applyAuthenticatedUser(resolvedUser);
          } else {
            await checkAppState();
          }
        }

        if (cancelled) return;

        navigate(
          nextPath || resolveSynapsysAuthDestination(intent, resolvedUser || access),
          { replace: true },
        );
      } catch (setupError) {
        if (!cancelled) {
          setError(normalizeSynapsysSetupError(setupError));
          setLoading(false);
          authFlowLockRef.current = false;
        }
      }
    }

    void finalizeAuthenticatedFlow();

    return () => {
      cancelled = true;
    };
  }, [
    access,
    applyAuthenticatedUser,
    checkAppState,
    intent,
    isAuthenticated,
    isLoadingAuth,
    navigate,
    nextPath,
    user,
  ]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = await submitAuthRequest({
        path: '/auth/login',
        apiBaseUrl,
        body: {
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        },
      });

      if (!payload?.token || !payload?.user) {
        throw new Error('Falha ao iniciar sessão.');
      }

      setApiSession({
        token: payload.token,
        email: payload?.user?.email || loginEmail.trim().toLowerCase(),
      });
      applyAuthenticatedUser(payload.user);
    } catch (loginError) {
      setError(
        mapAuthRequestError(loginError, {
          apiBaseUrl,
          path: '/auth/login',
        }),
      );
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const normalizedEmail = signupEmail.trim().toLowerCase();
    if (trimmedName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    if (signupPassword.length < 8) {
      setError('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const payload = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: trimmedName,
          email: normalizedEmail,
          password: signupPassword,
        },
      });

      if (!payload?.token) {
        throw new Error('Cadastro concluído sem token de sessão.');
      }

      setApiSession({
        token: payload.token,
        email: payload?.user?.email || normalizedEmail,
      });

      if (payload?.user) {
        applyAuthenticatedUser(payload.user);
      } else {
        await checkAppState();
      }
    } catch (signupError) {
      setError(normalizeSignupError(signupError));
      setLoading(false);
    }
  };

  const showAuthStatePanel = isLoadingAuth || isAuthenticated;

  return (
    <SynapsysSiteShell compact>
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[34px] border border-white/10 bg-[#06101c]/84 p-6 shadow-[0_25px_80px_rgba(2,8,24,0.34)] backdrop-blur-2xl sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/84">
            <BrainCircuit className="h-4 w-4" />
            Cadastro obrigatório
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white">
            Entre na Synapsys e continue o fluxo sem sair do produto.
          </h1>
          <p className="mt-4 text-base leading-8 text-white/68">
            Você precisa ter conta para usar o chat gratuito ou seguir para a contratação premium.
            Depois do login, o fluxo continua automaticamente para a etapa correta.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                icon: LockKeyhole,
                title: 'Autenticação obrigatória',
                text: 'Garante histórico pessoal, controle de limite diário e uma jornada consistente.',
              },
              {
                icon: Sparkles,
                title: intent === 'premium' ? 'Intent premium preservada' : 'Entrada grátis preservada',
                text:
                  intent === 'premium'
                    ? 'Depois do login, você segue para a oferta premium e contratação.'
                    : 'Depois do login, o acesso grátis é ativado dentro da própria Synapsys.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.07] text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/66">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={buildSynapsysEntryPath()}>
              <Button
                variant="ghost"
                className="rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                Voltar para a entrada
              </Button>
            </Link>
            {intent === 'premium' ? (
              <Link to={buildSynapsysPricingPath({ plan: 'premium' })}>
                <Button
                  variant="ghost"
                  className="rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  Ver oferta premium
                </Button>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_80px_rgba(2,8,24,0.28)] backdrop-blur-xl sm:p-8">
          {showAuthStatePanel ? (
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/84">
                <Sparkles className="h-4 w-4" />
                Preparando sua entrada
              </div>

              <h2 className="text-3xl font-semibold text-white">
                {error ? 'Não foi possível concluir o fluxo agora.' : 'Estamos conectando sua conta à Synapsys.'}
              </h2>
              <p className="text-sm leading-7 text-white/66">
                {error
                  ? 'Sua autenticação foi reconhecida, mas a ativação da experiência da Synapsys falhou nesta tentativa.'
                  : intent === 'premium'
                    ? 'Depois do login, você segue para a contratação premium sem depender do painel interno do InsightDISC.'
                    : 'Depois do login, o acesso gratuito é provisionado separadamente antes de liberar o chat neural.'}
              </p>

              {error ? (
                <div className="rounded-2xl border border-rose-400/24 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-[#07101d] px-5 py-4">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-cyan-200" />
                  <div>
                    <p className="text-sm font-medium text-white">Validando autenticação e acesso do produto</p>
                    <p className="text-xs text-white/54">
                      Usuário autenticado não recebe acesso automático. A Synapsys libera a camada certa aqui.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link to={buildSynapsysEntryPath()}>
                  <Button
                    variant="ghost"
                    className="rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    Voltar para a entrada
                  </Button>
                </Link>
                {intent === 'premium' ? (
                  <Link to={buildSynapsysPricingPath({ plan: 'premium' })}>
                    <Button
                      variant="ghost"
                      className="rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    >
                      Ir para planos
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setError('');
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    tab === 'login'
                      ? 'bg-white text-slate-950'
                      : 'text-white/68 hover:text-white'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    setError('');
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    tab === 'signup'
                      ? 'bg-white text-slate-950'
                      : 'text-white/68 hover:text-white'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-400/24 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              {tab === 'login' ? (
                <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="synapsys-login-email" className="text-white/78">E-mail</Label>
                    <Input
                      id="synapsys-login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      required
                      className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="synapsys-login-password" className="text-white/78">Senha</Label>
                    <Input
                      id="synapsys-login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      required
                      className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !loginEmail.trim() || !loginPassword}
                    className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-cyan-50"
                  >
                    {loading ? 'Entrando...' : 'Entrar e continuar'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label htmlFor="synapsys-signup-name" className="text-white/78">Nome</Label>
                    <Input
                      id="synapsys-signup-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      required
                      className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="synapsys-signup-email" className="text-white/78">E-mail</Label>
                    <Input
                      id="synapsys-signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                      placeholder="voce@empresa.com"
                      autoComplete="email"
                      required
                      className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="synapsys-signup-password" className="text-white/78">Senha</Label>
                      <Input
                        id="synapsys-signup-password"
                        type="password"
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="synapsys-signup-confirm-password" className="text-white/78">Confirmar senha</Label>
                      <Input
                        id="synapsys-signup-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        className="h-12 rounded-2xl border-white/12 bg-[#07101d] text-white placeholder:text-white/28"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !name || !signupEmail || !signupPassword || !confirmPassword}
                    className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-cyan-50"
                  >
                    {loading ? 'Criando conta...' : 'Criar conta e continuar'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </SynapsysSiteShell>
  );
}

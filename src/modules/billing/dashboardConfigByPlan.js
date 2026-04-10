/**
 * dashboardConfigByPlan.js — Fonte de verdade central das abas/tabs por plano (V3.0)
 *
 * Cada aba tem:
 *   key          — identificador único
 *   label        — texto exibido no menu
 *   section      — seção do sidebar
 *   to           — rota de destino
 *   page         — pageName para matching ativo
 *   iconKey      — nome do ícone (resolvido em runtime pelo nav)
 *   state        — 'enabled' | 'locked' | 'hidden'
 *   upgradeToKey — plano mínimo para desbloquear (quando locked)
 *   upgradeLabel — texto do CTA de upgrade
 *
 * Para derivar o estado de uma aba para um plano específico, use:
 *   getTabStateForPlan(tabKey, planKey)
 */

import { V3_PLAN_KEYS, v3IsPlanAtLeast } from './v3Config.js';

// ---------------------------------------------------------------------------
// Estado de aba
// ---------------------------------------------------------------------------
export const TAB_STATE = Object.freeze({
  ENABLED: 'enabled',
  LOCKED: 'locked',
  HIDDEN: 'hidden',
});

// ---------------------------------------------------------------------------
// Definição master de todas as abas do produto
// ---------------------------------------------------------------------------
export const ALL_TABS = Object.freeze([
  // ── Desenvolvimento Individual ──────────────────────────────────────────
  {
    key: 'dashboard',
    label: 'Painel',
    section: 'Desenvolvimento Individual',
    to: '/painel',
    page: 'Dashboard',
    iconKey: 'LayoutDashboard',
    minPlan: V3_PLAN_KEYS.DISC_INDIVIDUAL,
  },
  {
    key: 'reports',
    label: 'Relatórios',
    section: 'Desenvolvimento Individual',
    to: '/MyAssessments#reports',
    page: 'MyAssessments',
    iconKey: 'FileBarChart2',
    minPlan: V3_PLAN_KEYS.DISC_INDIVIDUAL,
  },
  {
    key: 'export-pdf',
    label: 'Exportar PDF',
    section: 'Desenvolvimento Individual',
    to: '/MyAssessments',
    page: 'MyAssessments',
    iconKey: 'FileDown',
    minPlan: V3_PLAN_KEYS.DISC_INDIVIDUAL,
    // Apenas disc_individual usa este label; outros usam "Relatórios"
    onlyFor: [V3_PLAN_KEYS.DISC_INDIVIDUAL],
  },
  {
    key: 'assessments',
    label: 'Avaliações',
    section: 'Desenvolvimento Individual',
    to: '/MyAssessments',
    page: 'MyAssessments',
    iconKey: 'ClipboardList',
    minPlan: V3_PLAN_KEYS.PERSONAL,
  },
  {
    key: 'history',
    label: 'Histórico',
    section: 'Desenvolvimento Individual',
    to: '/painel/historico',
    page: 'PanelHistorico',
    iconKey: 'Clock',
    minPlan: V3_PLAN_KEYS.PERSONAL,
  },
  {
    key: 'library',
    label: 'Biblioteca',
    section: 'Desenvolvimento Individual',
    to: '/disc-library',
    page: 'DiscLibrary',
    iconKey: 'BookOpen',
    minPlan: V3_PLAN_KEYS.INSIDER,
  },
  {
    key: 'comparison',
    label: 'Comparação',
    section: 'Desenvolvimento Individual',
    to: '/compare-profiles',
    page: 'CompareProfiles',
    iconKey: 'Radar',
    minPlan: V3_PLAN_KEYS.INSIDER,
  },
  {
    key: 'dossier',
    label: 'Dossiê',
    section: 'Desenvolvimento Individual',
    to: '/app/dossier',
    page: 'Dossier',
    iconKey: 'BookMarked',
    minPlan: V3_PLAN_KEYS.PROFESSIONAL,
  },
  {
    key: 'archetypes',
    label: 'Arquétipos',
    section: 'Desenvolvimento Individual',
    to: '/painel/arquetipos',
    page: 'PanelArquetipos',
    iconKey: 'Sparkles',
    minPlan: V3_PLAN_KEYS.PROFESSIONAL,
  },
  {
    key: 'coach',
    label: 'Coach',
    section: 'Desenvolvimento Individual',
    to: '/painel/coach',
    page: 'PanelCoach',
    iconKey: 'MessageCircle',
    minPlan: V3_PLAN_KEYS.PROFESSIONAL,
  },
  {
    key: 'ai-lab',
    label: 'AI Lab',
    section: 'Desenvolvimento Individual',
    to: '/painel/ai-lab',
    page: 'PanelAiLab',
    iconKey: 'BrainCircuit',
    minPlan: V3_PLAN_KEYS.PROFESSIONAL,
  },

  // ── Gestão e Equipes ────────────────────────────────────────────────────
  {
    key: 'team-map',
    label: 'Team Map',
    section: 'Gestão e Equipes',
    to: '/team-map',
    page: 'TeamMap',
    iconKey: 'Network',
    minPlan: V3_PLAN_KEYS.CORPORATION,
    upgradeLabel: 'Disponível no Business Corporation',
  },
  {
    key: 'rh-gestao',
    label: 'RH & Gestão de Pessoas',
    section: 'Gestão e Equipes',
    to: '/painel/rh-gestao',
    page: 'PanelRhGestao',
    iconKey: 'Users2',
    minPlan: V3_PLAN_KEYS.CORPORATION,
    upgradeLabel: 'Disponível no Business Corporation',
  },
  {
    key: 'usuarios',
    label: 'Usuários',
    section: 'Gestão e Equipes',
    to: '/painel/usuarios',
    page: 'PanelUsuarios',
    iconKey: 'UserCog',
    minPlan: V3_PLAN_KEYS.CORPORATION,
    upgradeLabel: 'Disponível no Business Corporation',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    section: 'Gestão e Equipes',
    to: '/app/analytics',
    page: 'AnalyticsDashboard',
    iconKey: 'BarChart3',
    minPlan: V3_PLAN_KEYS.CORPORATION,
    upgradeLabel: 'Disponível no Business Corporation',
  },

  // ── Marca e Operação ────────────────────────────────────────────────────
  {
    key: 'white-label',
    label: 'White Label',
    section: 'Marca e Operação',
    to: '/app/branding',
    page: 'BrandingSettings',
    iconKey: 'Palette',
    minPlan: V3_PLAN_KEYS.PROFESSIONAL,    // aparece a partir do Pro (como locked)
    addonFor: [V3_PLAN_KEYS.PROFESSIONAL, V3_PLAN_KEYS.BUSINESS],
    upgradeLabel: 'Add-on disponível · ou incluso no Corporation+',
  },

  // ── Consultoria Premium ─────────────────────────────────────────────────
  {
    key: 'consultorio',
    label: 'Consultório & Ferramentas',
    section: 'Consultoria Premium',
    to: '/painel/consultorio',
    page: 'PanelConsultorio',
    iconKey: 'Stethoscope',
    minPlan: V3_PLAN_KEYS.DIAMOND_CONSULTING,
    upgradeLabel: 'Exclusivo do Diamond Consulting',
  },
  {
    key: 'estrategia-executiva',
    label: 'Estratégia Executiva',
    section: 'Consultoria Premium',
    to: '/painel/estrategia-executiva',
    page: 'PanelEstrategiaExecutiva',
    iconKey: 'TrendingUp',
    minPlan: V3_PLAN_KEYS.DIAMOND_CONSULTING,
    upgradeLabel: 'Exclusivo do Diamond Consulting',
  },
]);

// ---------------------------------------------------------------------------
// Mapa de tabs com estados por plano (gerado dinamicamente)
// ---------------------------------------------------------------------------

/**
 * Retorna o estado de uma aba para um dado plano.
 * 'enabled' → ativo e acessível
 * 'locked'  → visível mas bloqueado com CTA de upgrade
 * 'hidden'  → não aparece
 */
export function getTabStateForPlan(tabKey, planKey) {
  const tab = ALL_TABS.find((t) => t.key === tabKey);
  if (!tab) return TAB_STATE.HIDDEN;

  // Abas com onlyFor: só aparecem para os planos listados
  if (tab.onlyFor && !tab.onlyFor.includes(planKey)) {
    return TAB_STATE.HIDDEN;
  }
  // Inverso: se não tem onlyFor mas a aba é export-pdf, esconde para planos > disc_individual
  if (
    tabKey === 'export-pdf' &&
    planKey !== V3_PLAN_KEYS.DISC_INDIVIDUAL
  ) {
    return TAB_STATE.HIDDEN;
  }
  // Aba "assessments" não aparece para disc_individual (usa export-pdf em vez disso)
  if (tabKey === 'assessments' && planKey === V3_PLAN_KEYS.DISC_INDIVIDUAL) {
    return TAB_STATE.HIDDEN;
  }

  if (v3IsPlanAtLeast(planKey, tab.minPlan)) {
    // Verificação especial para white-label em planos Professional/Business:
    // aparece como add-on (locked) mesmo que o plan seja >= professional
    if (
      tabKey === 'white-label' &&
      (planKey === V3_PLAN_KEYS.PROFESSIONAL || planKey === V3_PLAN_KEYS.BUSINESS)
    ) {
      return TAB_STATE.LOCKED; // add-on opcional
    }
    return TAB_STATE.ENABLED;
  }

  // Abas dos níveis 'Gestão e Equipes' e 'Consultoria Premium' aparecem bloqueadas
  // para planos abaixo do mínimo (não esconder — mostrar que existe mais)
  if (
    tab.section === 'Gestão e Equipes' ||
    tab.section === 'Consultoria Premium' ||
    tab.section === 'Marca e Operação'
  ) {
    return TAB_STATE.LOCKED;
  }

  // Abas de Desenvolvimento Individual: aparecem locked para planos abaixo do mínimo
  // (exceto as mais básicas que ficam hidden para não poluir)
  const devIndividualAlwaysLocked = [
    'dossier', 'archetypes', 'coach', 'ai-lab', 'library', 'comparison',
  ];
  if (devIndividualAlwaysLocked.includes(tabKey)) {
    return TAB_STATE.LOCKED;
  }

  return TAB_STATE.HIDDEN;
}

/**
 * Retorna todas as abas com estado resolvido para o plano dado.
 * Filtra hidden, retorna { tab, state } para enabled e locked.
 */
export function getTabsForPlan(planKey) {
  return ALL_TABS
    .map((tab) => ({
      tab,
      state: getTabStateForPlan(tab.key, planKey),
    }))
    .filter(({ state }) => state !== TAB_STATE.HIDDEN);
}

/**
 * Retorna apenas as abas enabled para um plano.
 */
export function getEnabledTabsForPlan(planKey) {
  return getTabsForPlan(planKey)
    .filter(({ state }) => state === TAB_STATE.ENABLED)
    .map(({ tab }) => tab);
}

/**
 * Retorna metadados da aba (label de upgrade, plano mínimo etc).
 */
export function getTabMeta(tabKey) {
  return ALL_TABS.find((t) => t.key === tabKey) || null;
}

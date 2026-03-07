function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortByField(items, sort) {
  if (!sort) return [...items];
  const desc = String(sort).startsWith("-");
  const field = desc ? String(sort).slice(1) : String(sort);

  return [...items].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return desc ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
  });
}

function byCriteria(items, criteria = {}) {
  return items.filter((item) =>
    Object.entries(criteria).every(([key, value]) => item?.[key] === value)
  );
}

function applyLimit(items, limit) {
  if (typeof limit !== "number") return items;
  return items.slice(0, Math.max(0, limit));
}

const MOCK_AUTH_STORAGE_KEY = "disc_mock_user_email";
const MOCK_ACTIVE_TENANT_STORAGE_KEY = "disc_mock_active_tenant";
const MOCK_DB_STORAGE_KEY = "disc_mock_db_v1";

const store = {
  users: [
    {
      id: "user-pro",
      full_name: "Profissional",
      email: "pro@example.com",
      role: "professional",
      global_role: null,
      tenant_role: "TENANT_ADMIN",
      tenant_id: "workspace-1",
      active_workspace_id: "workspace-1",
      entitlements: ["report.pro", "report.export.pdf", "report.export.csv"],
      plan: "premium",
      created_date: "2026-02-20T10:00:00.000Z",
    },
    {
      id: "user-2",
      full_name: "Admin",
      email: "admin@example.com",
      role: "admin",
      global_role: "PLATFORM_ADMIN",
      tenant_role: "TENANT_ADMIN",
      tenant_id: "workspace-1",
      active_workspace_id: "workspace-1",
      entitlements: ["support.report.sensitive", "report.export.pdf", "report.export.csv"],
      plan: "premium",
      created_date: "2026-02-10T10:00:00.000Z",
    },
    {
      id: "user-super",
      full_name: "Super Admin",
      email: "superadmin@example.com",
      role: "admin",
      global_role: "SUPER_ADMIN",
      tenant_role: null,
      tenant_id: null,
      entitlements: ["report.pro", "report.export.pdf", "report.export.csv"],
      plan: "premium",
      created_date: "2026-02-01T10:00:00.000Z",
    },
    {
      id: "user-tenant",
      full_name: "Usuário Tenant",
      email: "user@example.com",
      role: "user",
      global_role: null,
      tenant_role: "TENANT_USER",
      tenant_id: "workspace-1",
      active_workspace_id: "workspace-1",
      entitlements: [],
      plan: "free",
      created_date: "2026-02-12T10:00:00.000Z",
    },
    {
      id: "user-3",
      full_name: "Cliente Final",
      email: "cliente@example.com",
      role: "customer",
      global_role: null,
      tenant_role: "END_CUSTOMER",
      tenant_id: "tenant-individual-user-3",
      active_workspace_id: null,
      entitlements: [],
      plan: "free",
      created_date: "2026-02-10T10:00:00.000Z",
    },
  ],
  workspaces: [
    {
      id: "workspace-1",
      name: "DISC Lab",
      company_name: "DISC Lab",
      logo_url: "/brand/insightdisc-logo-transparent.png",
      brand_primary_color: "#0b1f3b",
      brand_secondary_color: "#f7b500",
      report_footer_text: "InsightDISC - Plataforma de Análise Comportamental",
      plan: "pro",
      subscription_status: "active",
      credits_balance: 48,
      monthly_used: 2,
      created_date: "2026-02-01T10:00:00.000Z",
    },
    {
      id: "workspace-2",
      name: "DISC Labs Enterprise",
      company_name: "DISC Labs Enterprise",
      logo_url: "/brand/insightdisc-logo-transparent.png",
      brand_primary_color: "#0b1f3b",
      brand_secondary_color: "#f7b500",
      report_footer_text: "InsightDISC - Plataforma de Análise Comportamental",
      plan: "enterprise",
      subscription_status: "active",
      credits_balance: 120,
      monthly_used: 11,
      created_date: "2026-02-01T10:00:00.000Z",
    },
  ],
  assessments: [
    {
      id: "assessment-1",
      user_id: "pro@example.com",
      respondent_email: "pro@example.com",
      respondent_name: "Profissional",
      type: "premium",
      status: "completed",
      professional_id: "user-pro",
      workspace_id: "workspace-1",
      tenant_id: "workspace-1",
      access_token: "tok-1",
      report_unlocked: true,
      created_date: "2026-03-01T10:00:00.000Z",
      completed_at: "2026-03-01T10:15:00.000Z",
      results: {
        dominant_factor: "D",
        natural_profile: { D: 70, I: 55, S: 40, C: 60 },
        adapted_profile: { D: 65, I: 50, S: 45, C: 62 },
        adjustment_energy: 18,
      },
    },
    {
      id: "assessment-2",
      user_id: "user@example.com",
      respondent_email: "user@example.com",
      respondent_name: "Usuário Tenant",
      type: "premium",
      status: "completed",
      professional_id: "user-pro",
      workspace_id: "workspace-1",
      tenant_id: "workspace-1",
      access_token: "tok-2",
      report_unlocked: true,
      created_date: "2026-03-02T10:00:00.000Z",
      completed_at: "2026-03-02T10:15:00.000Z",
      results: {
        dominant_factor: "I",
        natural_profile: { D: 45, I: 72, S: 58, C: 35 },
        adapted_profile: { D: 48, I: 68, S: 55, C: 40 },
        adjustment_energy: 26,
      },
    },
  ],
  transactions: [
    {
      id: "tx-1",
      product: "credits_50",
      amount: 119000,
      status: "completed",
      created_date: "2026-03-01T12:00:00.000Z",
      workspace_id: "workspace-1",
      tenant_id: "workspace-1",
    },
  ],
  jobPositions: [
    {
      id: "position-1",
      title: "Executivo de Vendas",
      department: "Vendas",
      workspace_id: "workspace-1",
      tenant_id: "workspace-1",
      is_active: true,
      candidates: [],
      key_competencies: ["Negociacao", "Comunicacao"],
      ideal_profile: {
        D: { min: 40, max: 85, ideal: 70 },
        I: { min: 30, max: 80, ideal: 60 },
        S: { min: 10, max: 55, ideal: 35 },
        C: { min: 20, max: 65, ideal: 45 },
      },
      created_date: "2026-02-22T10:00:00.000Z",
    },
  ],
  teams: [
    {
      id: "team-1",
      name: "Time Comercial",
      workspace_id: "workspace-1",
      tenant_id: "workspace-1",
      members: [
        { id: "member-1", name: "Ana", role: "Closer", assessment_id: "assessment-1" },
        { id: "member-2", name: "Bruno", role: "SDR", assessment_id: "assessment-2" },
      ],
      analysis: {
        strengths: ["Comunicacao", "Proatividade"],
        gaps: ["Padronizacao"],
      },
      created_date: "2026-02-21T10:00:00.000Z",
    },
  ],
};

function loadPersistedStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MOCK_DB_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    Object.entries(parsed).forEach(([key, value]) => {
      if (Array.isArray(store[key]) && Array.isArray(value)) {
        store[key] = value;
      }
    });
  } catch {
    // ignore invalid persisted payload
  }
}

function persistStore() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota/storage errors
  }
}

loadPersistedStore();

function findUserByEmail(email) {
  if (!email) return null;
  return store.users.find((user) => String(user.email).toLowerCase() === String(email).toLowerCase()) || null;
}

function getSessionEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
}

function setSessionEmail(email) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, email);
}

function clearSessionEmail() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
}

function getCurrentUser() {
  const email = getSessionEmail();
  return findUserByEmail(email);
}

function getStoredActiveTenantId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MOCK_ACTIVE_TENANT_STORAGE_KEY);
}

function setStoredActiveTenantId(tenantId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_ACTIVE_TENANT_STORAGE_KEY, String(tenantId));
}

function clearStoredActiveTenantId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MOCK_ACTIVE_TENANT_STORAGE_KEY);
}

function getActiveTenantId(currentUser) {
  return (
    getStoredActiveTenantId() ||
    currentUser?.tenant_id ||
    currentUser?.active_workspace_id ||
    null
  );
}

const datasetByEntity = {
  User: "users",
  Workspace: "workspaces",
  Assessment: "assessments",
  Transaction: "transactions",
  JobPosition: "jobPositions",
  Team: "teams",
};

function getDataset(entity) {
  const key = datasetByEntity[entity];
  if (!key) throw new Error(`Unknown entity: ${entity}`);
  return key;
}

function entityApi(entityName) {
  const datasetKey = getDataset(entityName);
  const idPrefix = entityName.toLowerCase();

  return {
    async list(sort, limit) {
      const sorted = sortByField(store[datasetKey], sort);
      return applyLimit(sorted, limit);
    },

    async filter(criteria = {}, sort, limit) {
      const filtered = byCriteria(store[datasetKey], criteria);
      const sorted = sortByField(filtered, sort);
      return applyLimit(sorted, limit);
    },

    async create(payload = {}) {
      const item = {
        id: payload.id ?? makeId(idPrefix),
        created_date: payload.created_date ?? nowIso(),
        ...payload,
      };
      store[datasetKey] = [item, ...store[datasetKey]];
      persistStore();
      return item;
    },

    async update(id, payload = {}) {
      let updated = null;
      store[datasetKey] = store[datasetKey].map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...payload };
        return updated;
      });
      if (!updated) {
        throw new Error(`${entityName} not found: ${id}`);
      }
      persistStore();
      return updated;
    },
  };
}

export const base44Mock = {
  __isMock: true,

  auth: {
    async me() {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        const error = new Error("Not authenticated");
        error.status = 401;
        throw error;
      }

      if (currentUser?.global_role === "SUPER_ADMIN") {
        const activeTenantId = getActiveTenantId(currentUser);
        if (activeTenantId) {
          return {
            ...currentUser,
            active_workspace_id: activeTenantId,
            tenant_id: activeTenantId,
          };
        }
      }

      return currentUser;
    },
    async isAuthenticated() {
      return Boolean(getCurrentUser());
    },
    async login({ email } = {}) {
      const user = findUserByEmail(email);
      if (!user) {
        const error = new Error("Mock user not found");
        error.status = 404;
        throw error;
      }
      setSessionEmail(user.email);
      return user;
    },
    async setActiveTenant(tenantId) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        const error = new Error("Not authenticated");
        error.status = 401;
        throw error;
      }

      if (currentUser?.global_role !== "SUPER_ADMIN") {
        const error = new Error("Forbidden");
        error.status = 403;
        throw error;
      }

      if (!tenantId) {
        clearStoredActiveTenantId();
        return { ok: true, tenantId: null };
      }

      setStoredActiveTenantId(tenantId);
      return { ok: true, tenantId };
    },
    redirectToLogin(returnUrl) {
      if (typeof window !== "undefined") {
        if (returnUrl) {
          window.localStorage.setItem("disc_mock_return_url", returnUrl);
        }
        window.location.href = "/Login";
      }
    },
    logout(returnUrl) {
      clearSessionEmail();
      clearStoredActiveTenantId();
      if (typeof window !== "undefined") {
        if (returnUrl) {
          window.location.href = returnUrl;
          return;
        }
        window.location.href = "/";
      }
    },
  },

  entities: {
    User: entityApi("User"),
    Workspace: entityApi("Workspace"),
    Assessment: entityApi("Assessment"),
    Transaction: entityApi("Transaction"),
    JobPosition: entityApi("JobPosition"),
    Team: entityApi("Team"),
  },

  integrations: {
    Core: {
      async SendEmail(payload) {
        return {
          success: true,
          messageId: makeId("email"),
          payload,
        };
      },
    },
  },
};

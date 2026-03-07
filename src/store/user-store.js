import { create } from "zustand";

const initialState = {
  user: null,
  plan: "free",
  tenantId: null,
  globalRole: null,
  tenantRole: null,
  entitlements: [],
  lifecycleStatus: "anonymous",
  creditsBalance: 0,
};

export const useUserStore = create((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setPlan: (plan) => set({ plan }),
  setTenantId: (tenantId) => set({ tenantId }),
  setRoles: ({ globalRole = null, tenantRole = null } = {}) => set({ globalRole, tenantRole }),
  setEntitlements: (entitlements = []) => set({ entitlements }),
  setLifecycleStatus: (lifecycleStatus = "anonymous") => set({ lifecycleStatus }),
  setCreditsBalance: (creditsBalance = 0) => set({ creditsBalance }),
  setAuthContext: ({
    user = null,
    plan = "free",
    tenantId = null,
    globalRole = null,
    tenantRole = null,
    entitlements = [],
    lifecycleStatus = "anonymous",
    creditsBalance = 0,
  } = {}) =>
    set({
      user,
      plan,
      tenantId,
      globalRole,
      tenantRole,
      entitlements,
      lifecycleStatus,
      creditsBalance,
    }),
  resetAuthContext: () => set(initialState),
}));

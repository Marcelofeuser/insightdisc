import { create } from "zustand";

const initialState = {
  user: null,
  plan: "free",
  tenantId: null,
  globalRole: null,
  tenantRole: null,
  entitlements: [],
};

export const useUserStore = create((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setPlan: (plan) => set({ plan }),
  setTenantId: (tenantId) => set({ tenantId }),
  setRoles: ({ globalRole = null, tenantRole = null } = {}) => set({ globalRole, tenantRole }),
  setEntitlements: (entitlements = []) => set({ entitlements }),
  setAuthContext: ({
    user = null,
    plan = "free",
    tenantId = null,
    globalRole = null,
    tenantRole = null,
    entitlements = [],
  } = {}) =>
    set({
      user,
      plan,
      tenantId,
      globalRole,
      tenantRole,
      entitlements,
    }),
  resetAuthContext: () => set(initialState),
}));

import { useUserStore } from "@/store/user-store";
import { ENTITLEMENTS } from "@/modules/auth/permissions";

export function usePremium() {
  const plan = useUserStore((s) => s.plan);
  const entitlements = useUserStore((s) => s.entitlements);
  const hasProEntitlement = entitlements.includes(ENTITLEMENTS.REPORT_PRO);

  return {
    isPremium: plan === "premium" || hasProEntitlement,
    isFree: plan === "free"
  };
}

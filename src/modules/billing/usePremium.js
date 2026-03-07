import { useUserStore } from "@/store/user-store";
import { ENTITLEMENTS } from "@/modules/auth/permissions";
import { USER_LIFECYCLE } from "@/modules/auth/access-control";

export function usePremium() {
  const plan = useUserStore((s) => s.plan);
  const entitlements = useUserStore((s) => s.entitlements);
  const lifecycleStatus = useUserStore((s) => s.lifecycleStatus);
  const hasProEntitlement = entitlements.includes(ENTITLEMENTS.REPORT_PRO);
  const isPremiumLifecycle =
    lifecycleStatus === USER_LIFECYCLE.CUSTOMER_ACTIVE ||
    lifecycleStatus === USER_LIFECYCLE.SUPER_ADMIN;

  return {
    isPremium: isPremiumLifecycle || plan === "premium" || hasProEntitlement,
    isFree: plan === "free"
  };
}

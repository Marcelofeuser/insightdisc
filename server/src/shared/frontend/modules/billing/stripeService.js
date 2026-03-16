import { apiRequest } from '@/lib/apiClient';

export async function createStripeCheckoutSession(payload = {}) {
  const response = await apiRequest('/payments/create-checkout', {
    method: 'POST',
    requireAuth: true,
    body: payload,
  });

  return {
    ok: Boolean(response?.ok ?? true),
    url: String(response?.url || response?.checkoutUrl || '').trim(),
    id: String(response?.id || response?.sessionId || '').trim(),
    mocked: Boolean(response?.mocked),
  };
}

export async function openBillingPortal() {
  try {
    const response = await apiRequest('/billing/portal', {
      method: 'POST',
      requireAuth: true,
      body: {},
    });
    return {
      ok: true,
      url: String(response?.url || '/Pricing').trim() || '/Pricing',
    };
  } catch {
    return {
      ok: true,
      url: '/Pricing',
    };
  }
}

export async function upgradePlan(targetPlan = 'business') {
  try {
    const response = await apiRequest('/billing/change-plan', {
      method: 'POST',
      requireAuth: true,
      body: {
        action: 'upgrade',
        targetPlan,
      },
    });

    return {
      ok: true,
      action: response?.action || 'upgrade_requested',
      url: String(response?.checkoutUrl || response?.url || '').trim(),
      message: response?.message || '',
    };
  } catch {
    const checkout = await createStripeCheckoutSession({
      productType: 'business_subscription',
      product: 'business-monthly',
      mode: 'subscription',
    });
    return {
      ok: true,
      action: 'checkout_required',
      url: checkout.url,
      message: 'Upgrade redirecionado para checkout de assinatura.',
    };
  }
}

export async function downgradePlan(targetPlan = 'personal') {
  const response = await apiRequest('/billing/change-plan', {
    method: 'POST',
    requireAuth: true,
    body: {
      action: 'downgrade',
      targetPlan,
    },
  });

  return {
    ok: true,
    action: response?.action || 'downgrade_requested',
    message: response?.message || '',
  };
}

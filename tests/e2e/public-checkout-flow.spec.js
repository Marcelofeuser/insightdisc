import { test, expect } from '@playwright/test';
import { clearAuth } from './helpers/auth';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';

function enableCheckoutPreviewBypass(page) {
  return page.addInitScript(() => {
    window.localStorage.setItem(
      'insightdisc.checkout.preview.v1',
      JSON.stringify({
        seen: true,
        source: 'e2e',
        assessmentId: 'asm_preview_e2e',
        reportType: 'professional',
        seenAt: new Date().toISOString(),
      }),
    );
  });
}

test.describe('Public checkout flow', () => {
  test('visitante inicia checkout público sem login (sem redirect para /Login)', async ({ page }) => {
    test.skip(!IS_API_MODE, 'Checkout público é validado no modo API.');

    await clearAuth(page);
    await enableCheckoutPreviewBypass(page);

    let publicCheckoutCalls = 0;
    let authCheckoutCalls = 0;

    await page.route('**/payments/create-checkout-public', async (route) => {
      publicCheckoutCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          checkoutUrl: '/checkout/success?session_id=mock_public_professional&product=professional',
        }),
      });
    });

    await page.route('**/payments/create-checkout', async (route) => {
      authCheckoutCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'UNEXPECTED_AUTH_CHECKOUT_CALL',
          message: 'should not call /payments/create-checkout for visitante',
        }),
      });
    });

    await page.goto('/checkout/plan/professional', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/Login(?:\?|$)/i);
    await expect(page.getByRole('heading', { name: /Checkout do plano/i })).toBeVisible();

    const finalizeButton = page.getByRole('button', { name: /Finalizar pagamento/i }).first();
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();

    await page.waitForURL(/\/checkout\/success\?session_id=mock_public_professional/i);
    await expect(page).not.toHaveURL(/\/Login(?:\?|$)/i);

    expect(publicCheckoutCalls).toBe(1);
    expect(authCheckoutCalls).toBe(0);
  });

  test('checkout success faz claim após login e não duplica no refresh', async ({ page }) => {
    test.skip(!IS_API_MODE, 'Checkout público é validado no modo API.');

    await clearAuth(page);
    await enableCheckoutPreviewBypass(page);

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: {
            id: 'user_e2e_claim',
            email: 'pro@example.com',
            role: 'professional',
            plan: 'professional',
            has_paid_purchase: true,
          },
        }),
      });
    });

    await page.route('**/payments/create-checkout-public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          checkoutUrl: '/checkout/success?session_id=mock_public_claim&product=professional',
        }),
      });
    });

    let statusCalls = 0;
    let claimCalls = 0;

    await page.route('**/billing/checkout-session/**/status', async (route) => {
      statusCalls += 1;
      const payload =
        statusCalls === 1
          ? { ok: true, found: false, status: 'pending', paymentStatus: 'PENDING', creditsAdded: 0, balance: 0 }
          : { ok: true, found: true, status: 'paid', paymentStatus: 'PAID', creditsAdded: 10, balance: 10 };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.route('**/payments/claim-checkout', async (route) => {
      claimCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          found: true,
          status: 'paid',
          paymentStatus: 'PAID',
          creditsAdded: 10,
          balance: 10,
        }),
      });
    });

    await page.goto('/checkout/plan/professional', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Finalizar pagamento/i }).first().click();
    await page.waitForURL(/\/checkout\/success\?session_id=mock_public_claim/i);

    await expect(page.getByText(/Faça login para visualizar o status final do pagamento/i)).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.setItem('insightdisc_api_token', 'token_e2e_claim');
      window.localStorage.setItem('insightdisc_api_email', 'pro@example.com');
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Compra confirmada com sucesso/i })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Compra confirmada com sucesso/i })).toBeVisible();

    expect(claimCalls).toBe(1);
    expect(statusCalls).toBeGreaterThanOrEqual(2);
  });

  test('usuário autenticado usa checkout autenticado (sem create-checkout-public)', async ({ page }) => {
    test.skip(!IS_API_MODE, 'Checkout público é validado no modo API.');

    await enableCheckoutPreviewBypass(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('insightdisc_api_token', 'token_e2e_auth');
      window.localStorage.setItem('insightdisc_api_email', 'pro@example.com');
    });

    let authCheckoutCalls = 0;
    let publicCheckoutCalls = 0;
    let claimCalls = 0;

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: {
            id: 'user_e2e_auth',
            email: 'pro@example.com',
            role: 'professional',
            plan: 'professional',
            has_paid_purchase: true,
          },
        }),
      });
    });

    await page.route('**/payments/create-checkout', async (route) => {
      authCheckoutCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          checkoutUrl: '/checkout/success?session_id=mock_auth_checkout&product=professional',
        }),
      });
    });

    await page.route('**/payments/create-checkout-public', async (route) => {
      publicCheckoutCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'UNEXPECTED_PUBLIC_CHECKOUT_CALL',
        }),
      });
    });

    await page.route('**/billing/checkout-session/**/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, found: true, status: 'paid', paymentStatus: 'PAID', creditsAdded: 10, balance: 10 }),
      });
    });

    await page.route('**/payments/claim-checkout', async (route) => {
      claimCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'UNEXPECTED_CLAIM_CALL' }),
      });
    });

    await page.goto('/checkout/plan/professional', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Checkout do plano/i })).toBeVisible();
    await page.getByRole('button', { name: /Finalizar pagamento/i }).first().click();
    await page.waitForURL(/\/checkout\/success\?session_id=mock_auth_checkout/i);

    await expect(page.getByRole('heading', { name: /Compra confirmada com sucesso/i })).toBeVisible();

    expect(authCheckoutCalls).toBe(1);
    expect(publicCheckoutCalls).toBe(0);
    expect(claimCalls).toBe(0);
  });
});

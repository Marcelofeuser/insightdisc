function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveCreditsBalance(payload = {}) {
  const candidates = [
    payload?.credits,
    payload?.balance,
    payload?.summary?.credits,
    payload?.summary?.balance,
    payload?.data?.credits,
    payload?.data?.balance,
    payload?.user?.credits,
    payload?.user?.credits_balance,
    payload?.availableCredits,
    payload?.remainingCredits,
  ];

  for (const item of candidates) {
    const numeric = Number(item);
    if (Number.isFinite(numeric)) return numeric;
  }

  return 0;
}

export function canConsumeCredits({
  balance = 0,
  amount = 1,
  isUnlimited = false,
} = {}) {
  if (isUnlimited) {
    return {
      ok: true,
      balance: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      reason: 'unlimited',
    };
  }

  const normalizedBalance = toNumber(balance, 0);
  const normalizedAmount = Math.max(1, toNumber(amount, 1));
  const remaining = normalizedBalance - normalizedAmount;

  if (remaining < 0) {
    return {
      ok: false,
      balance: normalizedBalance,
      remaining,
      reason: 'insufficient_credits',
      required: normalizedAmount,
      missing: Math.abs(remaining),
    };
  }

  return {
    ok: true,
    balance: normalizedBalance,
    remaining,
    reason: 'enough_credits',
    required: normalizedAmount,
  };
}

export function buildCreditConsumptionResult({
  ok = false,
  userId = '',
  balance = 0,
  consumed = 0,
  remaining = 0,
  reason = '',
  source = '',
} = {}) {
  return {
    ok: Boolean(ok),
    userId: String(userId || '').trim(),
    balance: toNumber(balance, 0),
    consumed: toNumber(consumed, 0),
    remaining: Number.isFinite(Number(remaining)) ? Number(remaining) : remaining,
    reason: String(reason || '').trim(),
    source: String(source || '').trim(),
  };
}

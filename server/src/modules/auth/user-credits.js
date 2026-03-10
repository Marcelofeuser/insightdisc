export function getUserCreditsBalance(user = {}) {
  const credits = user?.credits

  if (Array.isArray(credits)) {
    const firstWithBalance = credits.find((entry) => Number.isFinite(Number(entry?.balance)))
    return Number(firstWithBalance?.balance || 0)
  }

  return Number(credits?.balance || user?.creditBalance || 0)
}

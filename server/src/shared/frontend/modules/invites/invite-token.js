function fallbackHash(input) {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateInviteToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${crypto.randomUUID().replaceAll("-", "")}${Date.now().toString(36)}`;
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function hashInviteToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return "";

  try {
    if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
      const encoded = new TextEncoder().encode(raw);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      return bytesToHex(new Uint8Array(digest));
    }
  } catch {
    // fallback below
  }

  return fallbackHash(raw);
}

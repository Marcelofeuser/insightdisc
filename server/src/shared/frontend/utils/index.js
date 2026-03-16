export function createPageUrl(pageName) {
  if (!pageName || pageName === "Home") {
    return "/";
  }

  return `/${encodeURIComponent(pageName)}`;
}


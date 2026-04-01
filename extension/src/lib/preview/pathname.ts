export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, normalized.length - 1)
    : normalized;
}

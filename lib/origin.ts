/** Accept loopback aliases only in local development; production stays exact-origin. */
export function isAllowedOrigin(
  requestUrl: string,
  origin: string | null,
  configuredOrigin?: string,
  development = false,
) {
  if (!origin) return false;
  try {
    const target = new URL(configuredOrigin || requestUrl);
    const incoming = new URL(origin);
    if (origin !== incoming.origin) return false;
    if (incoming.origin === target.origin) return true;
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return (
      development &&
      !configuredOrigin &&
      loopback.has(target.hostname) &&
      loopback.has(incoming.hostname) &&
      incoming.protocol === target.protocol &&
      incoming.port === target.port
    );
  } catch {
    return false;
  }
}

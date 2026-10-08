export type DesktopAction = "open-chrome" | "open-spotify-in-chrome";

export function desktopActionIntent(text: string): DesktopAction | null {
  const normalized = text
    .toLowerCase()
    .replace(/[â€™']/g, "'")
    .trim()
    .replace(/[.!?]+$/, "");
  const prefix =
    /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)?(?:open|launch|start)\s+/;
  const request = normalized.replace(prefix, "");
  if (request === normalized) return null;
  if (
    /^(?:the\s+)?spotify(?:\s+website)?\s+(?:in|within|with\s+in|using)\s+(?:the\s+)?(?:google\s+)?chrome(?:\s+browser)?(?:\s+on\s+(?:my|this)\s+(?:laptop|computer|device))?$/.test(
      request,
    )
  )
    return "open-spotify-in-chrome";
  if (
    /^(?:the\s+)?(?:google\s+)?chrome(?:\s+(?:browser|on\s+(?:my|this)\s+(?:laptop|computer|device)))?$/.test(
      request,
    )
  )
    return "open-chrome";
  return null;
}

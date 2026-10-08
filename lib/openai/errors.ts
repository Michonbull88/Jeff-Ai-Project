const quotaCodes = new Set([
  "insufficient_quota",
  "credit_balance_exhausted",
  "billing_hard_limit_reached",
  "billing_not_active",
  "organization_usage_limit_exceeded",
  "project_spend_limit_exceeded",
  "organization_spend_limit_exceeded",
  "billing_limit_usd",
  "usage_limit_reached",
]);

// Never surface provider error messages: they may contain credentials or request data.
export function openAIErrorMessage(
  status: number | undefined,
  code?: string | null,
  type?: string | null,
) {
  if ((code && quotaCodes.has(code)) || type === "insufficient_quota")
    return "OpenAI API credits or spending limits are blocking JEFF. Check billing and limits for the API key’s project at platform.openai.com, then try again. A ChatGPT subscription does not provide API credits.";
  if (status === 429)
    return "OpenAI is receiving too many requests. Please wait a minute and try again.";
  if (status === 401)
    return "OpenAI rejected the server’s API key. Check OPENAI_API_KEY in .env.local and restart JEFF.";
  if (status === 403)
    return "This OpenAI project does not have permission for this request. Check the API key’s permissions and model access.";
  if (status === 404)
    return "The configured OpenAI model is unavailable to this project. Check the model name and project access.";
  if (status === 400)
    return "OpenAI could not accept JEFF’s configuration. Check the configured model and voice settings.";
  return "JEFF could not reach OpenAI. Check your internet connection and try again.";
}

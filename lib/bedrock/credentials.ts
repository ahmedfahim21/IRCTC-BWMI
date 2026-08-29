/** True when Bedrock can authenticate (API key or IAM access keys). */
export function hasBedrockCredentials(): boolean {
  if (process.env.AWS_BEARER_TOKEN_BEDROCK?.trim()) return true;
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

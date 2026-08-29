import { anthropic } from "@ai-sdk/anthropic";
import { amazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createBedrockMantle } from "@ai-sdk/amazon-bedrock/mantle";
import { hasBedrockCredentials } from "@/lib/bedrock/credentials";

export const CHAT_PROVIDERS = ["anthropic", "bedrock-oss", "bedrock-luna"] as const;
export type ChatBackend = (typeof CHAT_PROVIDERS)[number];

const region = process.env.AWS_REGION ?? "us-east-1";

const mantle = createBedrockMantle({
  region,
  // GPT-5.6 requires the /openai/v1 prefix; the SDK default is /v1.
  baseURL: `https://bedrock-mantle.${region}.api.aws/openai/v1`,
});

function defaultModel(backend: ChatBackend): string {
  switch (backend) {
    case "anthropic":
      return "claude-sonnet-5";
    case "bedrock-oss":
      return "openai.gpt-oss-120b-1:0";
    case "bedrock-luna":
      return "openai.gpt-5.6-luna";
    default: {
      const unreachable: never = backend;
      return unreachable;
    }
  }
}

/** Converse IDs use a version suffix; Mantle IDs do not. */
function normalizeBedrockOssModelId(model: string): string {
  if (/^openai\.gpt-oss-120b$/i.test(model)) return "openai.gpt-oss-120b-1:0";
  if (/^openai\.gpt-oss-20b$/i.test(model)) return "openai.gpt-oss-20b-1:0";
  return model;
}

/** Active backend from CHAT_PROVIDER env. Defaults to anthropic. */
export function chatBackend(): ChatBackend {
  const raw = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (raw === "bedrock-oss" || raw === "bedrock_oss" || raw === "gpt-oss") return "bedrock-oss";
  if (raw === "bedrock-luna" || raw === "bedrock_luna" || raw === "gpt-luna" || raw === "luna") {
    return "bedrock-luna";
  }
  if (raw === "anthropic" || raw === "claude") return "anthropic";
  return "anthropic";
}

export function chatModelId(): string {
  const backend = chatBackend();
  const model = process.env.MODEL?.trim() || defaultModel(backend);
  if (backend === "bedrock-oss") return normalizeBedrockOssModelId(model);
  return model;
}

export function hasLiveChatCredentials(): boolean {
  const backend = chatBackend();
  switch (backend) {
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    case "bedrock-oss":
    case "bedrock-luna":
      return hasBedrockCredentials();
    default: {
      const unreachable: never = backend;
      return unreachable;
    }
  }
}

export function chatModel() {
  const backend = chatBackend();
  const model = chatModelId();

  switch (backend) {
    case "anthropic":
      return anthropic(model);
    case "bedrock-oss":
      return amazonBedrock(model);
    case "bedrock-luna":
      return mantle.responses(model);
    default: {
      const unreachable: never = backend;
      return unreachable;
    }
  }
}

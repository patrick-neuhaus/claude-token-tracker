import type { Request } from "express";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface WebhookUser {
  userId: string;
  email: string;
}

export interface WebhookRequest extends Request {
  webhookUser?: WebhookUser;
}

export interface TokenPayload {
  timestamp: string;
  source: "claude-code" | "claude.ai" | "codex";
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  // Wave 4 A1 P1: cost_usd is server-computed only — never trusted from
  // client payload. Kept optional in the type to avoid breaking internal
  // callers that still reference it; webhook schema drops it entirely.
  cost_usd?: number;
  session_id?: string;
  conversation_url?: string;
  auto_name?: string;
  session_name?: string;
  project?: string;
  cwd?: string;
}

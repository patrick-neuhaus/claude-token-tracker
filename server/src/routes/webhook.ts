import { Router } from "express";
import { z } from "zod";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { insertTokenEntry } from "../services/tokenService.js";
import type { WebhookRequest } from "../types/index.js";

const router = Router();

const payloadSchema = z.object({
  timestamp: z.string(),
  source: z.enum(["claude-code", "claude.ai"]),
  model: z.string().min(1),
  input_tokens: z.number().int().min(0).default(0),
  output_tokens: z.number().int().min(0).default(0),
  cache_read: z.number().int().min(0).default(0),
  cache_read_tokens: z.number().int().min(0).optional(),
  cache_write: z.number().int().min(0).default(0),
  cache_write_tokens: z.number().int().min(0).optional(),
  total_tokens: z.number().int().min(0).default(0),
  cost_usd: z.number().min(0).default(0),
  cost_brl: z.number().min(0).optional(),
  session_id: z.string().optional(),
  conversation_url: z.string().optional(),
  auto_name: z.string().max(120).optional(),
  session_name: z.string().max(100).optional(),
});

router.post("/track-tokens", webhookAuth, async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: parsed.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  const data = parsed.data;

  // Map alternative field names from collectors
  // Use || here because Zod defaults cache_read to 0, so ?? won't fall through
  const normalizedPayload = {
    ...data,
    cache_read: data.cache_read || data.cache_read_tokens || 0,
    cache_write: data.cache_write || data.cache_write_tokens || 0,
    auto_name: data.auto_name,
    session_name: data.session_name,
  };

  const webhookReq = req as WebhookRequest;

  try {
    const result = await insertTokenEntry(webhookReq.webhookUser!.userId, normalizedPayload);

    if (result.duplicate) {
      res.status(200).json({ status: "ok", duplicate: true, cost_usd: 0 });
      return;
    }

    res.status(201).json({ status: "ok", cost_usd: result.cost_usd });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ERROR]", message);
    res.status(500).json({ status: "error", message });
  }
});

export default router;

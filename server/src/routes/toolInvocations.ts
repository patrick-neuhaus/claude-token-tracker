import { Router } from "express";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserId, getDateRange } from "../utils/routeHelpers.js";
import {
  recordToolUse,
  getStats,
} from "../services/toolInvocationsService.js";
import type { WebhookRequest } from "../types/index.js";

const router = Router();

interface TrackBody {
  tool_name?: unknown;
  duration_ms?: unknown;
  success?: unknown;
  session_id?: unknown;
  project?: unknown;
  cwd?: unknown;
  timestamp?: unknown;
}

/**
 * POST /api/tool-invocations/track
 * Webhook from the claude-code PostToolUse hook. Records one row per tool call.
 * Auth: X-Webhook-Token (per-user token in users.webhook_token).
 */
router.post(
  "/track",
  webhookAuth,
  asyncHandler<unknown, unknown, TrackBody>(async (req, res) => {
    const { tool_name, duration_ms, success, session_id, project, cwd, timestamp } =
      (req.body ?? {}) as TrackBody;

    if (typeof tool_name !== "string" || !tool_name.trim()) {
      res.status(400).json({ status: "error", message: "tool_name is required" });
      return;
    }

    let parsedTs: Date | undefined;
    if (typeof timestamp === "string" && timestamp) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) parsedTs = d;
    }

    let parsedDuration: number | null = null;
    if (typeof duration_ms === "number" && isFinite(duration_ms) && duration_ms >= 0) {
      parsedDuration = Math.round(duration_ms);
    }

    const webhookReq = req as WebhookRequest;
    const result = await recordToolUse({
      user_id: webhookReq.webhookUser!.userId,
      tool_name: tool_name.trim(),
      duration_ms: parsedDuration,
      success: typeof success === "boolean" ? success : true,
      session_id: typeof session_id === "string" ? session_id : undefined,
      project_name: typeof project === "string" ? project : undefined,
      cwd: typeof cwd === "string" ? cwd : undefined,
      timestamp: parsedTs,
    });

    res.status(201).json({ status: "ok", id: result.id, timestamp: result.timestamp });
  })
);

// JWT-protected stats endpoint
router.use(authMiddleware);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const { from, to } = getDateRange(req);
    const session_id =
      typeof req.query.session_id === "string" ? req.query.session_id : undefined;
    const project_id =
      typeof req.query.project_id === "string" ? req.query.project_id : undefined;

    const data = await getStats({
      user_id: getUserId(req),
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      session_id,
      project_id,
    });
    res.json(data);
  })
);

export default router;

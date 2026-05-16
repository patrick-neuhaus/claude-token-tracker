import { Router } from "express";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserId, getDateRange } from "../utils/routeHelpers.js";
import {
  recordInvocation,
  getStats,
  type SkillDecision,
} from "../services/skillInvocationsService.js";
import type { WebhookRequest } from "../types/index.js";

const router = Router();

interface TrackBody {
  skill_name?: unknown;
  decision?: unknown;
  source?: unknown;
  session_id?: unknown;
  project_id?: unknown;
  timestamp?: unknown;
}

/**
 * POST /api/skill-invocations/track
 * Webhook from the claude-code PreToolUse hook. Records one row per Skill invocation.
 * Auth: X-Webhook-Token (per-user token in users.webhook_token).
 */
router.post(
  "/track",
  webhookAuth,
  asyncHandler<unknown, unknown, TrackBody>(async (req, res) => {
    const { skill_name, decision, source, session_id, project_id, timestamp } =
      (req.body ?? {}) as TrackBody;

    if (typeof skill_name !== "string" || !skill_name.trim()) {
      res
        .status(400)
        .json({ status: "error", message: "skill_name is required" });
      return;
    }
    if (decision !== "allow" && decision !== "deny") {
      res.status(400).json({
        status: "error",
        message: "decision must be 'allow' or 'deny'",
      });
      return;
    }

    let parsedTs: Date | undefined;
    if (typeof timestamp === "string" && timestamp) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) parsedTs = d;
    }

    const webhookReq = req as WebhookRequest;
    const result = await recordInvocation({
      user_id: webhookReq.webhookUser!.userId,
      skill_name: skill_name.trim(),
      decision: decision as SkillDecision,
      source: typeof source === "string" ? source : undefined,
      session_id: typeof session_id === "string" ? session_id : undefined,
      project_id: typeof project_id === "string" ? project_id : undefined,
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
    const data = await getStats({
      user_id: getUserId(req),
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json(data);
  })
);

export default router;

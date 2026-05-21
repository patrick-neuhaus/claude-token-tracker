import { Router } from "express";
import { z } from "zod";
import { webhookAuth } from "../middleware/webhookAuth.js";
import { webhookLimiter } from "../middleware/rateLimit.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUserId } from "../utils/routeHelpers.js";
import {
  recordPreCompact,
  recordPostCompact,
  getStats,
} from "../services/compactionsService.js";
import type { WebhookRequest } from "../types/index.js";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/compactions/track  (webhook)
// ---------------------------------------------------------------------------
// Receives PreCompact / PostCompact events from the PS1 hooks.
// event="pre"  → recordPreCompact
// event="post" → recordPostCompact

interface TrackBody {
  event?: unknown;
  session_id?: unknown;
  before_tokens?: unknown;
  after_tokens?: unknown;
  trigger?: unknown;
  timestamp?: unknown;
  project_id?: unknown;
}

router.post(
  "/track",
  webhookLimiter,
  webhookAuth,
  asyncHandler<unknown, unknown, TrackBody>(async (req, res) => {
    const body = (req.body ?? {}) as TrackBody;
    const webhookReq = req as WebhookRequest;
    const user_id = webhookReq.webhookUser!.userId;

    const event = body.event;
    const session_id =
      typeof body.session_id === "string" ? body.session_id.trim() : null;

    if (!session_id) {
      res.status(400).json({ status: "error", message: "session_id is required" });
      return;
    }

    let parsedTs: Date | undefined;
    if (typeof body.timestamp === "string") {
      const d = new Date(body.timestamp);
      if (!isNaN(d.getTime())) parsedTs = d;
    }

    if (event === "pre") {
      const before_tokens =
        typeof body.before_tokens === "number" ? body.before_tokens : null;
      if (before_tokens === null) {
        res
          .status(400)
          .json({ status: "error", message: "before_tokens is required for pre event" });
        return;
      }

      const trigger =
        body.trigger === "manual" ? "manual" : ("auto" as const);

      // UUID guard: invalid UUID would crash INSERT downstream. Coerce to undefined.
      const projectIdParse = z
        .string()
        .uuid()
        .optional()
        .nullable()
        .safeParse(body.project_id);
      if (!projectIdParse.success) {
        res
          .status(400)
          .json({ status: "error", message: "project_id must be a valid UUID" });
        return;
      }
      const project_id = projectIdParse.data ?? undefined;

      const result = await recordPreCompact({
        user_id,
        session_id,
        before_tokens,
        trigger,
        project_id,
        timestamp: parsedTs,
      });

      res.status(201).json({ status: "ok", id: result.id });
      return;
    }

    if (event === "post") {
      const after_tokens =
        typeof body.after_tokens === "number" ? body.after_tokens : null;
      if (after_tokens === null) {
        res
          .status(400)
          .json({ status: "error", message: "after_tokens is required for post event" });
        return;
      }

      const result = await recordPostCompact({
        user_id,
        session_id,
        after_tokens,
        timestamp: parsedTs,
      });

      res.status(200).json({ status: "ok", updated: result.updated });
      return;
    }

    res
      .status(400)
      .json({ status: "error", message: "event must be 'pre' or 'post'" });
  })
);

// ---------------------------------------------------------------------------
// GET /api/compactions/stats  (JWT)
// ---------------------------------------------------------------------------

router.use(authMiddleware);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const user_id = getUserId(req);
    const session_id =
      typeof req.query.session_id === "string"
        ? req.query.session_id
        : undefined;

    const data = await getStats(user_id, { session_id });
    res.json(data);
  })
);

export default router;

import type { Response, NextFunction } from "express";
import { query } from "../config/database.js";
import type { WebhookRequest } from "../types/index.js";

export async function webhookAuth(
  req: WebhookRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers["x-webhook-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ status: "error", message: "Missing X-Webhook-Token" });
    return;
  }

  try {
    const result = await query(
      "SELECT id, email FROM users WHERE webhook_token = $1",
      [token]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ status: "error", message: "Invalid webhook token" });
      return;
    }
    req.webhookUser = { userId: result.rows[0].id, email: result.rows[0].email };
    next();
  } catch {
    res.status(500).json({ status: "error", message: "internal error" });
  }
}

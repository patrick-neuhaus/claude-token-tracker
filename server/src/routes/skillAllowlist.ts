import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getStatus,
  setStatus,
  listAll,
  type AllowlistStatus,
} from "../services/skillAllowlistService.js";

const router = Router();
router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await listAll();
    res.json(rows);
  })
);

router.get(
  "/:name",
  asyncHandler<{ name: string }>(async (req, res) => {
    const entry = await getStatus(req.params.name);
    if (!entry) {
      res
        .status(404)
        .json({ status: "error", message: "Skill not in allowlist" });
      return;
    }
    res.json({ skill_name: req.params.name, ...entry });
  })
);

interface PatchBody {
  status?: unknown;
  notes?: unknown;
}

router.patch(
  "/:name",
  asyncHandler<{ name: string }, unknown, PatchBody>(async (req, res) => {
    const { status, notes } = (req.body ?? {}) as PatchBody;
    if (status !== "active" && status !== "deprecated") {
      res.status(400).json({
        status: "error",
        message: "status must be 'active' or 'deprecated'",
      });
      return;
    }

    const result = await setStatus(
      req.params.name,
      status as AllowlistStatus,
      typeof notes === "string" ? notes : null
    );
    res.json(result);
  })
);

export default router;

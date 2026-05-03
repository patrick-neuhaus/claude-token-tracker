import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { computeBadges, BADGE_CATEGORIES } from "../services/achievementsService.js";
import { getUserId } from "../utils/routeHelpers.js";

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/achievements
 *
 * Returns the full badge catalog for the authenticated user, with unlocked
 * status + progress per badge.
 *
 * Wave B4.1 V001 — single source of truth replaces 3-way client duplication.
 */
router.get("/", async (req, res) => {
  const data = await computeBadges(getUserId(req));
  res.json({
    badges: data.badges,
    totalUnlocked: data.totalUnlocked,
    total: data.total,
    byTier: data.byTier,
    categories: BADGE_CATEGORIES,
    stats: data.stats,
  });
});

export default router;

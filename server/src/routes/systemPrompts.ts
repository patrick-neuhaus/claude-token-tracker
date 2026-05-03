import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listSystemPrompts, getSystemPrompt } from "../services/systemPromptsService.js";

const router = Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (_req, res) => {
  const prompts = await listSystemPrompts();
  res.json(prompts);
}));

router.get("/:id", asyncHandler<{ id: string }>(async (req, res) => {
  const prompt = await getSystemPrompt(req.params.id);
  if (!prompt) {
    res.status(404).json({ status: "error", message: "System prompt not found" });
    return;
  }
  res.json(prompt);
}));

export default router;

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { listSystemPrompts, getSystemPrompt } from "../services/systemPromptsService.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const prompts = await listSystemPrompts();
    res.json(prompts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list system prompts";
    res.status(500).json({ status: "error", message: msg });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const prompt = await getSystemPrompt(req.params.id);
    if (!prompt) {
      res.status(404).json({ status: "error", message: "System prompt not found" });
      return;
    }
    res.json(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get system prompt";
    res.status(500).json({ status: "error", message: msg });
  }
});

export default router;

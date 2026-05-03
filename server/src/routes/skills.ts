import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listSkills, getSkill, getSkillFile, type SkillSource } from "../services/skillsService.js";

const router = Router();
router.use(authMiddleware);

function parseSource(raw: unknown): SkillSource | undefined {
  if (raw === "skillforge" || raw === "omc" || raw === "builtin") return raw;
  return undefined;
}

router.get("/", asyncHandler(async (_req, res) => {
  const skills = await listSkills();
  res.json(skills);
}));

router.get("/:name", asyncHandler<{ name: string }>(async (req, res) => {
  const source = parseSource(req.query.source);
  const skill = await getSkill(req.params.name, source);
  if (!skill) {
    res.status(404).json({ status: "error", message: "Skill not found" });
    return;
  }
  res.json(skill);
}));

router.get("/:name/file", asyncHandler<{ name: string }>(async (req, res) => {
  const filePath = req.query.path as string | undefined;
  if (!filePath) {
    res.status(400).json({ status: "error", message: "path query param required" });
    return;
  }
  const source = parseSource(req.query.source);
  const content = await getSkillFile(req.params.name, filePath, source);
  if (content === null) {
    res.status(404).json({ status: "error", message: "File not found" });
    return;
  }
  res.type("text/plain").send(content);
}));

export default router;

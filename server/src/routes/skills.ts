import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { listSkills, getSkill, getSkillFile, type SkillSource } from "../services/skillsService.js";

const router = Router();
router.use(authMiddleware);

function parseSource(raw: unknown): SkillSource | undefined {
  if (raw === "skillforge" || raw === "omc" || raw === "builtin") return raw;
  return undefined;
}

router.get("/", async (_req, res) => {
  try {
    const skills = await listSkills();
    res.json(skills);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list skills";
    res.status(500).json({ status: "error", message: msg });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const source = parseSource(req.query.source);
    const skill = await getSkill(req.params.name, source);
    if (!skill) {
      res.status(404).json({ status: "error", message: "Skill not found" });
      return;
    }
    res.json(skill);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get skill";
    res.status(500).json({ status: "error", message: msg });
  }
});

router.get("/:name/file", async (req, res) => {
  const filePath = req.query.path as string | undefined;
  if (!filePath) {
    res.status(400).json({ status: "error", message: "path query param required" });
    return;
  }
  try {
    const source = parseSource(req.query.source);
    const content = await getSkillFile(req.params.name, filePath, source);
    if (content === null) {
      res.status(404).json({ status: "error", message: "File not found" });
      return;
    }
    res.type("text/plain").send(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read file";
    res.status(500).json({ status: "error", message: msg });
  }
});

export default router;

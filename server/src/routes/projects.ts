import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  getProjects, getProjectDetail, createProject, updateProject, deleteProject,
  assignSession, unassignSession, getUnassignedSessions,
} from "../services/projectService.js";
import { getUserId, getDateRange } from "../utils/routeHelpers.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

router.get("/", async (req, res) => {
  const projects = await getProjects(getUserId(req));
  res.json(projects);
});

router.get("/unassigned-sessions", async (req, res) => {
  const sessions = await getUnassignedSessions(getUserId(req));
  res.json(sessions);
});

router.get("/:id", async (req, res) => {
  const { from, to } = getDateRange(req);
  const project = await getProjectDetail(getUserId(req), req.params.id, from, to);
  if (!project) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json(project);
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", message: parsed.error.issues[0].message });
    return;
  }
  const project = await createProject(getUserId(req), parsed.data.name, parsed.data.description);
  res.status(201).json(project);
});

router.patch("/:id", async (req, res) => {
  const result = await updateProject(getUserId(req), req.params.id, req.body);
  if (!result) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json(result);
});

router.delete("/:id", async (req, res) => {
  const deleted = await deleteProject(getUserId(req), req.params.id);
  if (!deleted) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json({ status: "ok" });
});

router.post("/:id/sessions/:sessionId", async (req, res) => {
  const result = await assignSession(getUserId(req), req.params.sessionId, req.params.id);
  if (!result) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(result);
});

router.delete("/:id/sessions/:sessionId", async (req, res) => {
  const result = await unassignSession(getUserId(req), req.params.sessionId);
  if (!result) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(result);
});

export default router;

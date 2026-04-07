import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  getProjects, getProjectDetail, createProject, updateProject, deleteProject,
  assignSession, unassignSession, getUnassignedSessions,
} from "../services/projectService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const projects = await getProjects(authReq.user!.userId);
  res.json(projects);
});

router.get("/unassigned-sessions", async (req, res) => {
  const authReq = req as AuthRequest;
  const sessions = await getUnassignedSessions(authReq.user!.userId);
  res.json(sessions);
});

router.get("/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const project = await getProjectDetail(authReq.user!.userId, req.params.id, from, to);
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
  const authReq = req as AuthRequest;
  const project = await createProject(authReq.user!.userId, parsed.data.name, parsed.data.description);
  res.status(201).json(project);
});

router.patch("/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await updateProject(authReq.user!.userId, req.params.id, req.body);
  if (!result) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json(result);
});

router.delete("/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const deleted = await deleteProject(authReq.user!.userId, req.params.id);
  if (!deleted) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json({ status: "ok" });
});

router.post("/:id/sessions/:sessionId", async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await assignSession(authReq.user!.userId, req.params.sessionId, req.params.id);
  if (!result) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(result);
});

router.delete("/:id/sessions/:sessionId", async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await unassignSession(authReq.user!.userId, req.params.sessionId);
  if (!result) {
    res.status(404).json({ status: "error", message: "Session not found" });
    return;
  }
  res.json(result);
});

export default router;

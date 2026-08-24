import { Router } from "express";
import {
  listLeads,
  createLead,
  getLead,
  updateLead,
  reassignLead,
  deleteLead,
} from "../controllers/leadController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listLeads);
router.post("/", createLead);
router.get("/:id", getLead);
router.patch("/:id", updateLead);
router.patch("/:id/reassign", requireRole("admin", "team_leader"), reassignLead);
router.delete("/:id", requireRole("admin"), deleteLead);

export default router;

import { Router } from "express";
import {
  listDeals,
  createDeal,
  getDeal,
  updateDeal,
  reassignDeal,
  addDealNote,
  deleteDeal,
  dealSummary,
} from "../controllers/dealController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listDeals);
router.post("/", createDeal);
router.get("/summary", dealSummary);
router.get("/:id", getDeal);
router.patch("/:id", updateDeal);
router.patch("/:id/reassign", requireRole("admin", "team_leader"), reassignDeal);
router.post("/:id/notes", addDealNote);
router.delete("/:id", requireRole("admin"), deleteDeal);

export default router;

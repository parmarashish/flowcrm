import { Router } from "express";
import { leadReport, dealReport, taskReport, agentPerformance } from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/leads", leadReport);
router.get("/deals", dealReport);
router.get("/tasks", taskReport);
router.get("/agents", agentPerformance);

export default router;

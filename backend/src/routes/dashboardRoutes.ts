import { Router } from "express";
import { summary, bySource, trend, activity } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/summary", summary);
router.get("/by-source", bySource);
router.get("/trend", trend);
router.get("/activity", activity);

export default router;

import { Router } from "express";
import { listActivity } from "../controllers/activityController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listActivity);

export default router;

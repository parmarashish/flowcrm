import { Router } from "express";
import { listUsers, updateUser } from "../controllers/userController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireRole("admin"));
router.get("/", listUsers);
router.patch("/:id", updateUser);

export default router;

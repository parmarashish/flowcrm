import { Router } from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserPermissions,
  getUserActivity,
} from "../controllers/userController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/permissions", updateUserPermissions);
router.get("/:id/activity", getUserActivity);

export default router;

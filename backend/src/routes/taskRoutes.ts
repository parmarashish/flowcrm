import { Router } from "express";
import {
  listTasks,
  createTask,
  getTask,
  updateTask,
  reassignTask,
  deleteTask,
  taskSummary,
} from "../controllers/taskController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listTasks);
router.post("/", createTask);
router.get("/summary", taskSummary);
router.get("/:id", getTask);
router.patch("/:id", updateTask);
router.patch("/:id/reassign", requireRole("admin", "team_leader"), reassignTask);
router.delete("/:id", requireRole("admin"), deleteTask);

export default router;

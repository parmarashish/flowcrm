import { Router } from "express";
import {
  listContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
} from "../controllers/contactController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listContacts);
router.post("/", createContact);
router.get("/:id", getContact);
router.patch("/:id", updateContact);
router.delete("/:id", requireRole("admin"), deleteContact);

export default router;

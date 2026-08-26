import { Router } from "express";
import {
  listCompanies,
  createCompany,
  getCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/companyController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listCompanies);
router.post("/", createCompany);
router.get("/:id", getCompany);
router.patch("/:id", updateCompany);
router.delete("/:id", requireRole("admin"), deleteCompany);

export default router;

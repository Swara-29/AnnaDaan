import { Router } from "express";
import {
  deleteManagedUser,
  getAdminActivity,
  getAdminDonations,
  getAdminStats,
  getAdminUsers
} from "../controllers/adminController.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verifyToken, isAdmin);
router.get("/stats", getAdminStats);
router.get("/users", getAdminUsers);
router.delete("/users/:userId", deleteManagedUser);
router.get("/donations", getAdminDonations);
router.get("/activity", getAdminActivity);

export default router;

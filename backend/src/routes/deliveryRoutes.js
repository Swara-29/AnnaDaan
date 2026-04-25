import { Router } from "express";
import { acceptVolunteerTask, optimizeRoutePlan, rejectVolunteerTask, updateDeliveryStatus } from "../controllers/donationController.js";

const router = Router();
router.post("/update-status", updateDeliveryStatus);
router.post("/accept-task", acceptVolunteerTask);
router.post("/reject-task", rejectVolunteerTask);
router.get("/optimize-route", optimizeRoutePlan);

export default router;

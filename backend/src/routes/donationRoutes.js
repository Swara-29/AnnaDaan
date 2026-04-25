import { Router } from "express";
import {
  acceptDonation,
  createDonation,
  listDonations,
  getNearbyDonations
} from "../controllers/donationController.js";

const router = Router();

router.post("/create", createDonation);
router.get("/nearby", getNearbyDonations);
router.get("/list", listDonations);
router.post("/accept", acceptDonation);

export default router;

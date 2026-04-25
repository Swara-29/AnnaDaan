import { Router } from "express";
import { loginWithPhonePassword, registerUser } from "../controllers/authController.js";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginWithPhonePassword);

export default router;

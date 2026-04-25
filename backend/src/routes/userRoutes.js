import { Router } from "express";
import { getUsers, updateUserModeration } from "../controllers/userController.js";

const router = Router();

router.get("/", getUsers);
router.patch("/:userId", updateUserModeration);

export default router;

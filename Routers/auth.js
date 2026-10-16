import express from "express";
import { register, login } from "../controllers/authController.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", register);
// router.post("/login", loginLimiter, login); // Disabled for local dev/testing
router.post("/login", login);

export default router;

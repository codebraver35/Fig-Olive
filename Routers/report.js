import express from "express";
import { getSalesReport } from "../controllers/reportController.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/checkAdmin.js";

const router = express.Router();

// Only ADMIN can view financial sales analytics! 🔒
router.get('/sales', authenticate, authorize('admin'), getSalesReport);

export default router;

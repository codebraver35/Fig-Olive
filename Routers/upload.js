import express from 'express';
import { getUploadAuth } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/checkAdmin.js';

const router = express.Router();

/**
 * GET /api/uploads/auth
 * Generates signed ImageKit upload tokens.
 * Strictly gated: Only logged-in administrators can request upload tokens.
 */
router.get('/auth', authenticate, authorize('admin'), getUploadAuth);

export default router;

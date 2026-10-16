import express from 'express';
import { getMeals,getMeal,createmeal,updatemeal,deletemeal } from '../controllers/mealController.js';
import validate from '../middleware/validateMeal.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from "../middleware/checkAdmin.js";

const router = express.Router();

router.get('/', getMeals);

router.get('/:id',getMeal);

router.post('/',authenticate,authorize('admin'),validate , createmeal);

router.put('/:id',authenticate,authorize('admin'),validate,updatemeal);

router.delete('/:id',authenticate,authorize('admin'),deletemeal);

export default router;
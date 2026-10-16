import express from "express";
import { getTables,addTable,updateTableStatus } from "../controllers/tablesController.js";
import { validateTable } from "../middleware/validateTable.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/checkAdmin.js";

const router = express.Router();

router.get('/',authenticate,authorize('admin','waiter','cashier'),getTables);

router.post('/',authenticate,authorize('admin'), validateTable,addTable);

router.patch('/:id',authenticate,authorize('admin','waiter'),updateTableStatus);

export default router;
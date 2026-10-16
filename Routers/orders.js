import { createOrder, getOrders, getOrder, updateOrderStatus, addOrderItems } from "../controllers/orderController.js";
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/checkAdmin.js";
import { validateOrder, validateOrderItems } from "../middleware/validateOrder.js";



const router = express.Router();

router.post('/', authenticate, authorize('cashier', 'admin', 'waiter'), validateOrder, createOrder);
router.post('/:id/items', authenticate, authorize('cashier', 'admin', 'waiter'), validateOrderItems, addOrderItems);
router.get('/', authenticate, authorize('cashier', 'admin', 'waiter'), getOrders);
router.get('/:id', authenticate, authorize('cashier', 'admin', 'waiter'), getOrder);
router.patch('/:id/status', authenticate, authorize('cashier', 'admin', 'waiter'), updateOrderStatus);

export default router;
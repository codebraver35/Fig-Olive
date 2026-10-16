import pool from "../config/db.js";

// ============================================================================
// @desc    Place a new restaurant order (Multi-table ACID Transaction)
// @route   POST /api/orders
// @access  Private (Waiter, Cashier, Admin)
// ============================================================================
export const createOrder = async (req, res, next) => {
    const { table_id, items } = req.body;
    const user_id = req.user.id; // Extracted from JWT token by auth middleware

    let connection;

    try {
        // --------------------------------------------------------------------
        // 1. ACQUIRE CONNECTION & START TRANSACTION
        // --------------------------------------------------------------------
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // --------------------------------------------------------------------
        // 2. VERIFY TABLE AVAILABILITY
        // --------------------------------------------------------------------
        const [tables] = await connection.execute(
            `SELECT * FROM restaurant_tables WHERE id = ?`,
            [table_id]
        );

        if (tables.length === 0) {
            const error = new Error(`Table with id ${table_id} not found.`);
            error.status = 404;
            throw error; // Jumps to catch block -> triggers rollback!
        }

        const table = tables[0];
        if (table.status === 'occupied') {
            const [activeOrders] = await connection.execute(
                `SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled')`,
                [table_id]
            );
            if (activeOrders.length > 0) {
                const error = new Error(`Table ${table.table_number} already has active Order #${activeOrders[0].id}. Please add dishes to that order.`);
                error.status = 400;
                throw error;
            }
        }

        // --------------------------------------------------------------------
        // 3. VERIFY MEALS, CHECK STOCK, AND CALCULATE TOTAL PRICE
        // --------------------------------------------------------------------
        let totalPrice = 0;
        const verifiedItems = [];

        for (const item of items) {
            const [meals] = await connection.execute(
                `SELECT id, name, price, is_available FROM meals WHERE id = ?`,
                [item.meal_id]
            );

            if (meals.length === 0) {
                const error = new Error(`Meal with id ${item.meal_id} does not exist.`);
                error.status = 404;
                throw error;
            }

            const meal = meals[0];

            if (!meal.is_available) {
                const error = new Error(`Meal "${meal.name}" is currently OUT OF STOCK.`);
                error.status = 400;
                throw error;
            }

            // Calculate subtotal for this item and add to running total
            const itemSubtotal = Number(meal.price) * item.quantity;
            totalPrice += itemSubtotal;

            // Save verified item snapshot (freezing the current unit_price)
            verifiedItems.push({
                meal_id: meal.id,
                name: meal.name,
                quantity: item.quantity,
                unit_price: meal.price
            });
        }

        // --------------------------------------------------------------------
        // 4. INSERT MASTER RECORD INTO `orders` TABLE
        // --------------------------------------------------------------------
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (table_id, user_id, status, total_price) VALUES (?, ?, 'pending', ?)`,
            [table_id, user_id, totalPrice]
        );

        const orderId = orderResult.insertId;

        // --------------------------------------------------------------------
        // 5. INSERT ALL ORDERED ITEMS INTO `order_items` TABLE
        // --------------------------------------------------------------------
        for (const item of verifiedItems) {
            await connection.execute(
                `INSERT INTO order_items (order_id, meal_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
                [orderId, item.meal_id, item.quantity, item.unit_price]
            );
        }

        // --------------------------------------------------------------------
        // 6. UPDATE TABLE STATUS TO 'occupied'
        // --------------------------------------------------------------------
        await connection.execute(
            `UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?`,
            [table_id]
        );

        // --------------------------------------------------------------------
        // 7. COMMIT TRANSACTION (ALL 6 STEPS SUCCEEDED!)
        // --------------------------------------------------------------------
        await connection.commit();

        // --------------------------------------------------------------------
        // 8. SEND RESPONSE TO CLIENT
        // --------------------------------------------------------------------
        res.status(201).json({
            message: "Order placed successfully",
            order: {
                id: orderId,
                table_id,
                table_number: table.table_number,
                staff_user_id: user_id,
                status: 'pending',
                total_price: totalPrice.toFixed(2),
                items: verifiedItems
            }
        });

    } catch (error) {
        // If ANY step above failed, undo all modifications!
        if (connection) {
            await connection.rollback();
        }
        next(error);

    } finally {
        // ALWAYS release the rented connection back to the pool
        if (connection) {
            connection.release();
        }
    }
};

export const getOrders = async (req,res,next)=>{
    try{
    const [rows] = await pool.execute(`
        SELECT U.username AS staff_name,
        O.id, O.table_id, T.table_number, O.status, O.total_price, O.created_at,
        (
            SELECT GROUP_CONCAT(CONCAT(oi.quantity, 'x ', m.name) SEPARATOR ', ')
            FROM order_items oi
            JOIN meals m ON oi.meal_id = m.id
            WHERE oi.order_id = O.id
        ) AS items_summary
        FROM orders O
        INNER JOIN restaurant_tables T ON O.table_id = T.id 
        INNER JOIN users U ON O.user_id = U.id
        ORDER BY O.created_at DESC`);

    res.status(200).json(rows);
    }
    catch(error){
        next(error);
    }
}

export const getOrder = async (req,res,next)=>{
    const id = req.params.id;
    try{
    const [rows] = await pool.execute(`
        SELECT U.username AS staff_name,
        O.id,T.table_number,O.status,O.total_price,O.created_at
        FROM orders O
        INNER JOIN restaurant_tables T ON O.table_id = T.id 
        INNER JOIN users U ON O.user_id= U.id
        WHERE O.id = ?
        ORDER BY O.created_at DESC`,[id]);
    if(rows.length ===0){
        const error = new Error("Order not Found!");
        error.status = 404;
        return next(error);
    }

    const [items] = await pool.execute(`
    SELECT oi.meal_id, m.name AS meal_name, oi.quantity, oi.unit_price
    FROM order_items oi
    INNER JOIN meals m ON oi.meal_id = m.id
    WHERE oi.order_id = ?`,
    [id]
    );

    const order = rows[0];
    order.items = items;
    res.status(200).json(order);
    }
    catch(error){
        next(error);
    }
}

export const updateOrderStatus = async (req,res,next) => {
    try{
    const allowedStatuses = ['pending', 'preparing', 'served', 'paid', 'cancelled'];

    const id = req.params.id;
    const {status} = req.body;

    if (!status || !allowedStatuses.includes(status)) {
        const error = new Error(`Invalid status. Allowed statuses are: ${allowedStatuses.join(', ')}`);
        error.status = 400;
        return next(error);
    }


    const [orders] = await pool.execute(`
        SELECT id , table_id,status FROM orders
        WHERE id = ?`,[id]);
    
    if (orders.length === 0) {
        const error = new Error(`Order with id ${id} not found.`);
        error.status = 404;
        return next(error);
    }

    if (status === 'paid' || status === 'cancelled') {
        await pool.execute(
        `UPDATE restaurant_tables SET status = 'available' WHERE id = ?`,
        [orders[0].table_id]
    );
}



    await pool.execute(`UPDATE orders SET status = ?
                        WHERE id = ? `,[status,id]);
    res.status(200).json({message:`Order #${id} status was updated to '${status}' successfully. `});
    }
    catch(error){
        next(error);
    }
};

// ============================================================================
// @desc    Add more dishes to an existing active order (Multi-table ACID Transaction)
// @route   POST /api/orders/:id/items
// @access  Private (Waiter, Cashier, Admin)
// ============================================================================
export const addOrderItems = async (req, res, next) => {
    const orderId = req.params.id;
    const { items } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Verify order exists and lock the row
        const [orders] = await connection.execute(
            `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
            [orderId]
        );

        if (orders.length === 0) {
            const error = new Error(`Order #${orderId} not found.`);
            error.status = 404;
            throw error;
        }

        const order = orders[0];
        if (order.status === 'paid' || order.status === 'cancelled') {
            const error = new Error(`Cannot add dishes to Order #${orderId} because it is already marked '${order.status}'.`);
            error.status = 400;
            throw error;
        }

        // 2. Verify meals, check stock, and calculate additional subtotal
        let addedTotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const [meals] = await connection.execute(
                `SELECT id, name, price, is_available FROM meals WHERE id = ?`,
                [item.meal_id]
            );

            if (meals.length === 0) {
                const error = new Error(`Meal with id ${item.meal_id} does not exist.`);
                error.status = 404;
                throw error;
            }

            const meal = meals[0];

            if (!meal.is_available) {
                const error = new Error(`Meal "${meal.name}" is currently OUT OF STOCK.`);
                error.status = 400;
                throw error;
            }

            const itemSubtotal = Number(meal.price) * item.quantity;
            addedTotal += itemSubtotal;

            verifiedItems.push({
                meal_id: meal.id,
                name: meal.name,
                quantity: item.quantity,
                unit_price: meal.price
            });
        }

        // 3. Insert or update items in order_items
        for (const item of verifiedItems) {
            const [existing] = await connection.execute(
                `SELECT id, quantity FROM order_items WHERE order_id = ? AND meal_id = ?`,
                [orderId, item.meal_id]
            );

            if (existing.length > 0) {
                await connection.execute(
                    `UPDATE order_items SET quantity = quantity + ? WHERE id = ?`,
                    [item.quantity, existing[0].id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO order_items (order_id, meal_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
                    [orderId, item.meal_id, item.quantity, item.unit_price]
                );
            }
        }

        // 4. Update order total & refresh lifecycle status:
        // If it was already 'served', adding new dishes moves it back to 'preparing' so kitchen prepares them!
        const newStatus = order.status === 'served' ? 'preparing' : order.status;
        const newTotal = Number(order.total_price) + addedTotal;

        await connection.execute(
            `UPDATE orders SET total_price = ?, status = ? WHERE id = ?`,
            [newTotal, newStatus, orderId]
        );

        // Ensure table status remains occupied
        await connection.execute(
            `UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?`,
            [order.table_id]
        );

        await connection.commit();

        res.status(200).json({
            message: `Dishes added successfully to Order #${orderId}`,
            order: {
                id: parseInt(orderId, 10),
                table_id: order.table_id,
                status: newStatus,
                total_price: newTotal.toFixed(2),
                added_items: verifiedItems
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

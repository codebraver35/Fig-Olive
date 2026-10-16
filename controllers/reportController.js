import pool from "../config/db.js";

export const getSalesReport = async (req, res, next) => {
    try {
        const { period } = req.query; // '24h', 'week', 'month', 'all'

        let orderDateFilter = "";
        let topMealsDateFilter = "";

        if (period === '24h') {
            orderDateFilter = "AND created_at >= NOW() - INTERVAL 24 HOUR";
            topMealsDateFilter = "AND o.created_at >= NOW() - INTERVAL 24 HOUR";
        } else if (period === 'week') {
            orderDateFilter = "AND created_at >= NOW() - INTERVAL 7 DAY";
            topMealsDateFilter = "AND o.created_at >= NOW() - INTERVAL 7 DAY";
        } else if (period === 'month') {
            orderDateFilter = "AND created_at >= NOW() - INTERVAL 30 DAY";
            topMealsDateFilter = "AND o.created_at >= NOW() - INTERVAL 30 DAY";
        }

        const [rows] = await pool.execute(`
           SELECT COUNT(*) AS paid_orders,
           COALESCE(SUM(total_price), 0) AS total_revenue
           FROM orders 
           WHERE status = 'paid' ${orderDateFilter}`);

        const [topMealsRows] = await pool.execute(`
            SELECT m.name AS meal_name,
            SUM(oi.quantity) AS total_quantity_sold,
            SUM(oi.quantity * oi.unit_price) AS total_earned
            FROM order_items oi
            JOIN meals m ON oi.meal_id = m.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'paid' ${topMealsDateFilter}
            GROUP BY oi.meal_id, m.name
            ORDER BY total_quantity_sold DESC
            LIMIT 3;`);

        res.status(200).json({
            period: period || 'all',
            summary: rows[0],
            top_selling_meals: topMealsRows
        });
    } catch (error) {
        next(error);
    }
};
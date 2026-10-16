export const validateOrder = (req, res, next) => {
    const { table_id, items } = req.body;

    // 1. Validate table_id is a positive integer
    if (typeof table_id !== 'number' || table_id <= 0 || !Number.isInteger(table_id)) {
        const error = new Error("Invalid order data: table_id must be a positive integer.");
        error.status = 400;
        return next(error);
    }

    // 2. Validate items is a non-empty array
    if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("Invalid order data: items must be a non-empty array.");
        error.status = 400;
        return next(error);
    }

    // 3. Validate each item has positive integer meal_id and quantity >= 1
    const hasInvalidItem = items.some(item => 
        !item || typeof item !== 'object' ||
        typeof item.meal_id !== 'number' || item.meal_id <= 0 || !Number.isInteger(item.meal_id) ||
        typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)
    );

    if (hasInvalidItem) {
        const error = new Error("Invalid order item: each item must have a valid meal_id and a quantity of at least 1.");
        error.status = 400;
        return next(error);
    }

    next();
};

export const validateOrderItems = (req, res, next) => {
    const { items } = req.body;

    // Validate items is a non-empty array
    if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("Invalid order data: items must be a non-empty array.");
        error.status = 400;
        return next(error);
    }

    // Validate each item has positive integer meal_id and quantity >= 1
    const hasInvalidItem = items.some(item => 
        !item || typeof item !== 'object' ||
        typeof item.meal_id !== 'number' || item.meal_id <= 0 || !Number.isInteger(item.meal_id) ||
        typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)
    );

    if (hasInvalidItem) {
        const error = new Error("Invalid order item: each item must have a valid meal_id and a quantity of at least 1.");
        error.status = 400;
        return next(error);
    }

    next();
};

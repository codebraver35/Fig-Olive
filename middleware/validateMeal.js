const validate = (req, res, next) => {
    const { name, price, category_id } = req.body;
    const numPrice = Number(price);
    const numCategory = Number(category_id);

    if (
        typeof name !== 'string' ||
        name.trim().length === 0 ||
        isNaN(numPrice) ||
        numPrice <= 0 ||
        isNaN(numCategory) ||
        !Number.isInteger(numCategory) ||
        numCategory <= 0
    ) {
        const error = new Error("Invalid meal data: please provide valid name, positive price, and a valid category_id");
        error.status = 400;
        return next(error);
    }

    // Normalize sanitized numeric values
    req.body.price = numPrice;
    req.body.category_id = numCategory;
    next();
};

export default validate;
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header exists and has the 'Bearer ' format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error("Access denied. No token provided.");
        error.status = 401;
        return next(error);
    }

    // 2. Extract the token string after 'Bearer '
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verify the token signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach decoded payload to req.user for downstream controllers
        req.user = decoded;

        // 5. Pass to the next middleware/controller
        next();
    } catch (err) {
        const error = new Error("Invalid or expired token.");
        error.status = 401;
        return next(error);
    }
};

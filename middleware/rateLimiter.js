import rateLimit from 'express-rate-limit';

// Limit login attempts to 5 requests per 15 minutes per IP address
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
    max: 5,                   // Maximum 5 attempts
    message: {
        success: false,
        message: "Too many login attempts from this IP. Please try again after 15 minutes."
    },
    standardHeaders: true, // Return standard `RateLimit-*` headers
    legacyHeaders: false   // Disable `X-RateLimit-*` headers
});

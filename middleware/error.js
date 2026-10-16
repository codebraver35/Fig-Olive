// middleware/error.js
// Express knows this is an error handler because it has 4 arguments: (err, req, res, next)

const errorHandler=(err,req,res,next) =>{
    // If the error has a custom status (like 404 or 400), use it; otherwise default to 500
    const statusCode = err.status || 500;

     // In production, mask 500 internal errors so attackers see no technical details
    const isProduction = process.env.NODE_ENV === 'production';
    const clientMessage = (statusCode === 500 && isProduction)
        ? "Internal server error. Please try again later."
        : err.message;
    res.status(statusCode).json({
        success: false,
        message: clientMessage
    });

};

export default errorHandler;
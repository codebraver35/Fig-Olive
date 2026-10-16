export const validateTable = (req,res,next) => {
    const {table_number , capacity} = req.body;
    if(typeof table_number !== 'string' || table_number.trim().length === 0 ||  typeof capacity !== 'number' ||capacity <=0 || !Number.isInteger(capacity) ){
        const error= new Error("Invalid table data: table_number must be a non-empty string and capacity must be a positive integer.");
        error.status=400;
        return next(error);
    } 
    next();
}


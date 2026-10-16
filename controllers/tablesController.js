import pool from "../config/db.js"
export const getTables = async (req,res,next) =>{
    try{
    const [rows] = await pool.execute(`
        SELECT * FROM restaurant_tables ORDER BY id ASC`);
        res.status(200).json(rows);
    }
    catch(error){
        next(error);
    }
}

export const addTable = async(req,res,next) =>{
    try{
    const {table_number , capacity} = req.body;
    
    const [result] = await pool.execute(`
        INSERT INTO restaurant_tables (table_number,capacity) 
        VALUES (?,?)`,[table_number,capacity]);
    
    res.status(201).json({id: result.insertId, table_number, capacity, status: 'available'});
    }
    catch(error){
        if(error.code === 'ER_DUP_ENTRY'){
            const customError = new Error("table number is already availabe , enter a unique one");
            customError.status = 409;
            return next(customError);
        }
        next(error);
    }
    
}

export const updateTableStatus = async(req,res,next) =>{
    try{
    const {id} = req.params;
    const {status} = req.body;

    const allowedStatuses = ['available', 'occupied'];
    if (!status || !allowedStatuses.includes(status)) {
        const error = new Error("Invalid status: status must be either 'available' or 'occupied'");
        error.status = 400;
        return next(error);
    }

    const [result] = await pool.execute(`
        UPDATE restaurant_tables
        SET status = ? WHERE id = ?`,[status,id]);

    if(result.affectedRows === 0){
        const error = new Error(`Table with id ${id} not found`)
        error.status = 404;
        return next(error);
    }
  

    res.status(200).json({ message: "Table status updated successfully" });

}
    catch(error){
        return next(error);
    }
    }
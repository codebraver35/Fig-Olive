import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";

export const register = async (req,res,next) => {
    try{
        const {username , email , password} = req.body;
        if (!username || !email || !password || password.length < 6) {
            const error = new Error("Please provide username, email, and a password with at least 6 characters.");
            error.status = 400;
            return next(error);
        }
        const [existingUsers] = await pool.execute(`
            SELECT id FROM users WHERE email = ?
            OR username = ?`,[email,username]);
        if(existingUsers.length>0){
            const error = new Error("Username or email is already in use.");
            error.status = 409; // Conflict
            return next(error);
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash  =await bcrypt.hash(password, salt);

        const [result] = await pool.execute(`
            INSERT INTO users (username , email , password_hash,role)
            VALUES (?,?,?,?)`,[username,email,password_hash,'customer']);
        res.status(201).json({
            id: result.insertId,
            username,
            email,
            role: 'customer'
        });
    }
    catch(error){
        next(error);
    }
};


export const login = async(req,res,next) =>{
try{
const {email , password} = req.body;

if(!email || !password ){
    const error = new Error("Please provide email and password");
    error.status = 400;
    return next(error);
}

const [existingUsers] = await pool.execute(`
    SELECT * FROM users
    WHERE email = ?`,[email]);

if(existingUsers.length === 0){
    const error = new Error("Invalid email or password");
    error.status =401;
    return next(error);
}

const user = existingUsers[0];
const isMatch = await bcrypt.compare(password,user.password_hash);

if(!isMatch){
    const error = new Error("Invalid email or password");
    error.status =401;
    return next(error);
}
//generating jwt token when logging in
const token = jwt.sign(
    {id:user.id , role : user.role},        // 1. Payload (Who is this?)
    process.env.JWT_SECRET,     // 2. Secret Key (to sign it)
    {expiresIn :process.env.JWT_EXPIRES_IN || '1d'} );

res.status(200).json({
    token,
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
});}
catch(error){
    return next(error);
}
}
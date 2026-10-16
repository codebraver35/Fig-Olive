import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Determine pool configuration based on environment
let poolConfig;

if (process.env.DATABASE_URL) {
  // Cloud platforms like Railway and Render often supply a single DATABASE_URL string
  poolConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

const pool = mysql.createPool(poolConfig);

export default pool;
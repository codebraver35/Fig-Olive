import 'dotenv/config';
import express from 'express';
import mealsRouter from './Routers/meal.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/error.js';
import reqLog from './middleware/requestLogger.js';
import authRouter from './Routers/auth.js';
import helmet from 'helmet';
import tableRouter from './Routers/tables.js';
import orderRouter from './Routers/orders.js'
import reportRouter from './Routers/report.js'
import uploadRouter from './Routers/upload.js';
import pool from './config/db.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy in production (e.g. Render, Railway, AWS, Nginx)
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false })); // Permissive CSP for Google Fonts and Unsplash images
app.use(reqLog);

const Port = process.env.PORT || 8000;

// Body parser middleware: Allows us to read raw JSON from req.body
app.use(express.json());

// Cloud Deployment Health & Database Keep-Alive Check
app.get('/health', async (req, res) => {
    try {
        // Execute a fast 1ms query to test database connectivity and keep cloud MySQL active
        await pool.query('SELECT 1');
        res.status(200).json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (err) {
        // Return 503 so Uptime monitors immediately detect database failure
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve static frontend files from 'frontend' directory
app.use(express.static(path.join(__dirname, 'frontend')));


app.use('/api/meals',mealsRouter);
app.use('/api/auth',authRouter);
app.use('/api/tables',tableRouter);
app.use('/api/orders',orderRouter);
app.use('/api/reports',reportRouter);
app.use('/api/uploads', uploadRouter);


app.use(notFound);

app.use(errorHandler);





const server = app.listen(Port, () => {
    console.log(`Server listening on port ${Port}`);
});

// Secondary port for local dev convenience only (disabled in production containers)
if (process.env.NODE_ENV !== 'production' && Number(Port) === 8000) {
    const secondaryServer = app.listen(8001, () => {
        console.log(`Secondary listener active on port 8001 (Dev only)`);
    });
    secondaryServer.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') {
            console.error('Secondary port error:', err.message);
        }
    });
}

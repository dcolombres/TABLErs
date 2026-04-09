import express from 'express';
import cors from 'cors';
import dataRoutes from './routes/data.routes.js';
import { connectSource } from './controllers/upload.controller.js';
const app = express();
const PORT = process.env.PORT || 3002;
// Configure CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both localhost variants
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.post('/api/connect', connectSource);
app.use('/api', dataRoutes);
app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

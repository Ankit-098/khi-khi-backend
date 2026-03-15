import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { transparencyMiddleware } from './middleware/transparency.middleware';
import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import profileRoutes from './routes/profile.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/creator-ecosystem';

// Middleware
app.use(cors());
app.use(express.json());
app.use(transparencyMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/profile', profileRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

// Database Connection & Server Start
const startServer = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Starting server without database connection...');
    }

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
};

startServer();

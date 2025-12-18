require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const fs = require('fs');
const path = require('path');

// Models (to trigger sync)
const User = require('./models/User');
const WhatsAppSession = require('./models/WhatsAppSession');
const AIConfig = require('./models/AIConfig');
const Message = require('./models/Message');

// Routes
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const aiRoutes = require('./routes/aiRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();

// Middlewares
app.use(cors({
    origin: 'https://box-ai.miabesite.site',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public'))); // Serve frontend from root /public

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for dashboard polling
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter);

// Routes
app.use('/auth', authRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/ai', aiRoutes);
app.use('/messages', messageRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Box-AI API', status: 'running' });
});

// Create sessions directory if not exists
const sessionsDir = path.join(__dirname, '../sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
}

// Database Connection & Server Start
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }) // use { force: true } to drop tables (dev only)
    .then(async () => {
        console.log('Database synced successfully.');

        // Resume active sessions
        const sessions = await WhatsAppSession.findAll();
        const { startSession } = require('./services/baileysService');

        console.log(`[Server] Resuming ${sessions.length} sessions...`);
        for (const session of sessions) {
            console.log(`[Server] Resuming session for ${session.userId}`);
            // Only resume if it was previously connected or scanning
            // But actually, startSession handles existence checks, so safe to call.
            startSession(session.userId);
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to sync database:', err);
    });

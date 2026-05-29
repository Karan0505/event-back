const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const cronJobs = require('./services/cron');


// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize cron jobs
cronJobs();

const app = express();

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://event-front-amber.vercel.app'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) {
            return callback(null, true);
        }
        
        // Allow any localhost origin
        if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
            return callback(null, true);
        }

        // Allow any Vercel deployment URL
        if (origin.startsWith('https://') && origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // Allow configured live origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/organizer', require('./routes/organizer'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/payment', require('./routes/payment'));


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Event Management API is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST /api/auth/signup`);
    console.log(`   POST /api/auth/login`);
    console.log(`   GET  /api/auth/me`);
    console.log(`   GET  /api/events`);
    console.log(`   POST /api/events`);
    console.log(`   GET  /api/events/:id`);
    console.log(`   PUT  /api/events/:id`);
    console.log(`   DEL  /api/events/:id`);
    console.log(`   POST /api/events/:id/register`);
    console.log(`   GET  /api/events/user/my-events`);
    console.log(`   GET  /api/events/user/my-tickets\n`);
});

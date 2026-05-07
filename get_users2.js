const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const User = require('./models/User');

const getRun = async () => {
    try {
        await connectDB();
        const users = await User.find({}, 'name email role');
        console.log("=== USERS IN THE DATABASE ===");
        console.table(users.map(u => ({ name: u.name, email: u.email, role: u.role })));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

getRun();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await User.findOne({ email: 'karanparmar0915@gmail.com' });
        if (admin) {
            console.log('Admin found:', admin.email, 'Role:', admin.role);
        } else {
            console.log('Admin NOT found with email: karanparmar0915@gmail.com');
            const anyAdmin = await User.findOne({ role: 'admin' });
            if (anyAdmin) {
                console.log('Current admin in DB is:', anyAdmin.email);
            } else {
                console.log('No admin role found in DB at all.');
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdmin();

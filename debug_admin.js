const connectDB = require('./config/db');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const debugAdmin = async () => {
    try {
        await connectDB();
        const user = await User.findOne({ email: 'karanparmar0915@gmail.com' });
        if (user) {
            console.log('✅ User found!');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Name:', user.name);
            // DO NOT log the hashed password, but check if we can reset it to admin123
            user.password = 'admin123';
            await user.save();
            console.log('🔄 Password has been reset to: admin123');
        } else {
            console.log('❌ User NOT found with email: karanparmar0915@gmail.com');
            const allUsers = await User.find({}, 'email role');
            console.log('Current users in DB:', allUsers);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugAdmin();

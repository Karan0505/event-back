const connectDB = require('./config/db');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const resetAdminPassword = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Find the admin user by email
        const user = await User.findOne({ email: 'karanparmar0915@gmail.com' });

        if (!user) {
            console.log('Admin user not found with email karanparmar0915@gmail.com');
            // Try searching by role just in case
            const anyAdmin = await User.findOne({ role: 'admin' });
            if (anyAdmin) {
                console.log(`Found admin with email: ${anyAdmin.email}. Updating this one instead...`);
                anyAdmin.email = 'karanparmar0915@gmail.com';
                anyAdmin.password = 'admin123';
                await anyAdmin.save();
                console.log('Admin updated with new email and password "admin123"');
            } else {
                console.log('No admin role found at all. Creating a new admin...');
                await User.create({
                    name: 'Admin User',
                    email: 'karanparmar0915@gmail.com',
                    password: 'admin123',
                    role: 'admin'
                });
                console.log('New admin created with password "admin123"');
            }
        } else {
            user.password = 'admin123';
            await user.save();
            console.log('Password reset to "admin123" for karanparmar0915@gmail.com');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetAdminPassword();

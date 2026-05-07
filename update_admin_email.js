const connectDB = require('./config/db');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const updateAdminEmail = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const result = await User.updateOne(
            { role: 'admin' },
            { $set: { email: 'karanparmar0915@gmail.com' } }
        );

        if (result.matchedCount === 0) {
            console.log('No admin user found to update.');
        } else {
            console.log('Successfully updated admin email to karanparmar0915@gmail.com');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating admin email:', error);
        process.exit(1);
    }
};

updateAdminEmail();

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const sendEmail = require('./email');

const testEmail = async () => {
    console.log('--- Email Diagnostic Test ---');
    console.log('Email Pass exists:', !!process.env.EMAIL_PASS);
    console.log('From Email:', process.env.FROM_EMAIL);
    console.log('From Name:', process.env.FROM_NAME);
    
    try {
        await sendEmail({
            email: process.env.FROM_EMAIL || 'maxparmar09@gmail.com', // Sending to yourself for testing
            subject: '🔍 Email Connection Test',
            message: 'If you see this, email transport is working correctly!',
            html: '<h1>Success!</h1><p>Your email integration is now active.</p>'
        });
        console.log('Test command finished execution.');
    } catch (err) {
        console.error('Diagnostic failed:', err);
    }
};

testEmail();

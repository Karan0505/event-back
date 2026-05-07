require('dotenv').config();
const sendEmail = require('./utils/email');

async function test() {
    console.log("Testing email...");
    try {
        await sendEmail({
            email: process.env.SUPPORT_EMAIL || 'maxparmar09@gmail.com',
            subject: 'Test Email',
            message: 'This is a test email to check if SendGrid is working.',
            html: '<p>This is a test email to check if SendGrid is working.</p>'
        });
        console.log("If no errors, it should be sent.");
    } catch (e) {
        console.error("Test script caught error:", e);
    }
}

test();

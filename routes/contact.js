const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/email');

// @route   POST api/contact
// @desc    Send a contact message
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const supportEmail = process.env.SUPPORT_EMAIL || 'support@eventx.com';

        const emailOptions = {
            email: supportEmail,
            subject: `New Contact Form Submission from ${name}`,
            message: `You have received a new message from the contact form.\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #0b2038;">New Contact Form Submission</h2>
                    <p>You have received a new message from the EventX contact form.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #14b8a6; border-radius: 3px;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `
        };

        await sendEmail(emailOptions);

        res.status(200).json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;

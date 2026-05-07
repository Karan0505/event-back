const cron = require('node-cron');
const Event = require('../models/Event');
const sendEmail = require('../utils/email');

const startCronJobs = () => {
    // Run every day at 8:00 AM (0 8 * * *)
    cron.schedule('0 8 * * *', async () => {
        try {
            console.log('Running daily cron job for event reminders...');
            
            // Find events happening within the next 24 to 48 hours
            const now = new Date();
            // Assuming event.date is stored as 00:00:00 of the day
            // We want events that are happening tomorrow.
            const tomorrowStart = new Date(now);
            tomorrowStart.setDate(now.getDate() + 1);
            tomorrowStart.setHours(0, 0, 0, 0);

            const tomorrowEnd = new Date(tomorrowStart);
            tomorrowEnd.setDate(tomorrowStart.getDate() + 1);

            const upcomingEvents = await Event.find({
                date: {
                    $gte: tomorrowStart,
                    $lt: tomorrowEnd
                }
            }).populate('attendees', 'name email');

            if (upcomingEvents.length === 0) {
                console.log('No upcoming events found for reminders.');
                return;
            }

            for (const event of upcomingEvents) {
                // Get unique attendees
                const uniqueAttendees = new Map();
                for (const attendee of event.attendees) {
                    if (attendee && attendee.email) {
                        uniqueAttendees.set(attendee._id.toString(), attendee);
                    }
                }

                for (const [id, attendee] of uniqueAttendees) {
                    const emailHTML = `
                        <h2>Event Reminder: ${event.title}</h2>
                        <p>Hi ${attendee.name},</p>
                        <p>This is a friendly reminder that <strong>${event.title}</strong> is happening tomorrow!</p>
                        <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${event.time}</p>
                        <p><strong>Location:</strong> ${event.location}</p>
                        <p>We look forward to seeing you there.</p>
                    `;
                    
                    try {
                        await sendEmail({
                            email: attendee.email,
                            subject: `Reminder: ${event.title} is Tomorrow!`,
                            html: emailHTML,
                            message: `Reminder: ${event.title} is happening tomorrow at ${event.time} in ${event.location}.`
                        });
                        console.log(`Reminder sent to ${attendee.email} for event ${event.title}`);
                    } catch (err) {
                        console.error(`Error sending reminder to ${attendee.email}:`, err);
                    }
                }
            }
            console.log('Finished sending event reminders.');
        } catch (error) {
            console.error('Error in event reminder cron job:', error);
        }
    });
};

module.exports = startCronJobs;

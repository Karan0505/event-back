const express = require('express');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const sendEmail = require('../utils/email');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @route   GET /api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const totalEvents = await Event.countDocuments();
        const events = await Event.find()
            .populate('organizer', 'name email')
            .sort({ date: 1 })
            .skip(skip)
            .limit(limit);

        res.json({
            events,
            currentPage: page,
            totalPages: Math.ceil(totalEvents / limit),
            totalEvents
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email');

        if (!event) {    
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/events
// @desc    Create a new event
// @access  Private (organizer, admin)
router.post('/', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const { title, description, date, time, location, category, price, image, maxAttendees } = req.body;

        const event = await Event.create({
            title,
            description,
            date,
            time,
            location,
            category,
            price,
            image,
            maxAttendees: maxAttendees || 100,
            organizer: req.user._id,
        });

        const populatedEvent = await Event.findById(event._id)
            .populate('organizer', 'name email');

        res.status(201).json(populatedEvent);

        // Send New Event Notification to ALL users (Run in background)
        setImmediate(async () => {
            try {
                const users = await User.find({ role: 'attendee' }).select('_id email name');
                const notifications = users.map(user => ({
                    user: user._id,
                    type: 'new_event',
                    message: `🎉 New Event Added: ${title}! Log in to Evently right now to book your tickets!`
                }));
                await Notification.insertMany(notifications);
                console.log(`Successfully created new event notifications for ${users.length} users.`);

                const emailSubject = `🎉 New Event Added: ${title}!`;
                const emails = users.map(u => u.email).filter(Boolean);
                if (emails.length > 0) {
                    const emailHTML = `
                        <h2>A new event just dropped!</h2>
                        <p><strong>${populatedEvent.organizer.name}</strong> just published a new event: <strong>${title}</strong>.</p>
                        <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${time}</p>
                        <p><strong>Location:</strong> ${location}</p>
                        <p><strong>Category:</strong> ${category}</p>
                        <p>Log in to Evently right now to book your tickets before they sell out!</p>
                        <p>See you there!</p>
                    `;

                    // Send email in batches of 90 to prevent SMTP BCC limits outage
                    const bccLimit = 90;
                    for (let i = 0; i < emails.length; i += bccLimit) {
                        const emailChunk = emails.slice(i, i + bccLimit);
                        await sendEmail({
                            bcc: emailChunk,
                            subject: emailSubject,
                            html: emailHTML,
                            message: `New event dropped! ${title} at ${location} on ${new Date(date).toLocaleDateString()}.`
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to notify users of new event', err);
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (owner organizer or admin)
router.put('/:id', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership (admin can edit any)
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this event' });
        }

        event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('organizer', 'name email')
            .populate('attendees', 'name email');

        res.json(event);

        // Send Event Update Notification to ONLY active attendees (Run in background)
        setImmediate(async () => {
            try {
                if (event.attendees && event.attendees.length > 0) {
                    // Extract unique attendee email records
                    const uniqueAttendees = new Map();
                    event.attendees.forEach(attendee => {
                        if (attendee._id) uniqueAttendees.set(attendee._id.toString(), attendee);
                    });
                    
                    const uniqueUserIds = Array.from(uniqueAttendees.keys());
                    
                    const notifications = uniqueUserIds.map(userId => ({
                        user: userId,
                        type: 'update',
                        message: `⚠️ Important Update: The organizer has just made some changes to the details of ${event.title}.`
                    }));
                    await Notification.insertMany(notifications);

                    console.log(`Successfully created event update notifications for ${uniqueUserIds.length} attendees.`);

                    const emailSubject = `⚠️ Important Update: ${event.title}`;
                    const emails = Array.from(uniqueAttendees.values())
                        .map(attendee => attendee.email)
                        .filter(Boolean);
                    
                    if (emails.length > 0) {
                        const emailHTML = `
                            <h2>Important Update: there has been an update to ${event.title}!</h2>
                            <p>The organizer <strong>${event.organizer.name}</strong> has just made some changes to the details of <strong>${event.title}</strong>, which you are currently registered for.</p>
                            <h3>Updated Event Details:</h3>
                            <ul>
                                <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
                                <li><strong>Time:</strong> ${event.time}</li>
                                <li><strong>Location:</strong> ${event.location}</li>
                            </ul>
                            <p>If these changes affect your ability to attend, you can always cancel your ticket from your User Dashboard.</p>
                            <p>Best regards,<br/>The Evently Team</p>
                        `;

                        // Send email in batches of 90 to prevent SMTP BCC limits outage
                        const bccLimit = 90;
                        for (let i = 0; i < emails.length; i += bccLimit) {
                            const emailChunk = emails.slice(i, i + bccLimit);
                            await sendEmail({
                                bcc: emailChunk,
                                subject: emailSubject,
                                html: emailHTML,
                                message: `The event ${event.title} has been updated. Please check the new details.`
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to notify users of event update', err);
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (owner organizer or admin)
router.delete('/:id', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        await event.deleteOne();
        res.json({ message: 'Event removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/events/:id/register
// @desc    Register for an event (book ticket)
// @access  Private
router.post('/:id/register', protect, async (req, res) => {
    try {
        const { quantity = 1, seats = [] } = req.body;
        const userId = req.user._id;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (seats && seats.length > 0) {
            const alreadyBooked = seats.filter(s => event.bookedSeats.includes(s));
            if (alreadyBooked.length > 0) {
                return res.status(400).json({ message: `Seats ${alreadyBooked.join(', ')} are already booked.` });
            }
        }

        // Check user limit (max 10 tickets per event)
        const userTicketCount = event.attendees.filter(id => id.toString() === userId.toString()).length;
        if (userTicketCount + quantity > 10) {
            return res.status(400).json({ message: `You can only book a maximum of 10 tickets per event. You already have ${userTicketCount} tickets.` });
        }

        // Perform transactional update using atomic operations to prevent concurrency race conditions
        const query = {
            _id: req.params.id,
            $expr: {
                $lte: [
                    { $add: [{ $size: "$attendees" }, quantity] },
                    "$maxAttendees"
                ]
            }
        };

        if (seats && seats.length > 0) {
            query.bookedSeats = { $nin: seats };
        }

        const updatedEvent = await Event.findOneAndUpdate(
            query,
            {
                $push: {
                    attendees: { $each: Array(quantity).fill(userId) },
                    ...(seats.length > 0 ? {
                        bookedSeats: { $each: seats },
                        seatsRecord: { user: userId, seats }
                    } : {})
                }
            },
            { new: true }
        )
        .populate('organizer', 'name email');

        if (!updatedEvent) {
            return res.status(400).json({ message: 'Registration failed. Either seats are already taken or event capacity is exceeded.' });
        }

        // Send Booking Confirmation Notification
        try {
            await Notification.create({
                user: req.user._id,
                type: 'booking',
                message: `✅ Booking Confirmed: You successfully booked ${quantity} ticket(s) for ${event.title}.`
            });
        } catch (notifError) {
            console.error('Failed to create booking notification:', notifError);
        }

        // Send Booking Confirmation Email
        try {
            const emailHTML = `
                <h2>Booking Confirmation</h2>
                <p>Hi ${req.user.name},</p>
                <p>You have successfully booked <strong>${quantity}</strong> ticket(s) for <strong>${event.title}</strong>.</p>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p>Thank you for using our platform!</p>
            `;
            await sendEmail({
                email: req.user.email,
                subject: `Booking Confirmed: ${event.title}`,
                html: emailHTML,
                message: `You have successfully booked ${quantity} ticket(s) for ${event.title}.`
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email', emailError);
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/events/:id/cancel
// @desc    Cancel registered tickets
// @access  Private
router.post('/:id/cancel', protect, async (req, res) => {
    try {
        const { quantity = 1 } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Remove from attendees, move to cancelledAttendees
        let cancelledCount = 0;
        for (let i = event.attendees.length - 1; i >= 0 && cancelledCount < quantity; i--) {
            if (event.attendees[i].toString() === req.user._id.toString()) {
                event.attendees.splice(i, 1);
                event.cancelledAttendees.push(req.user._id);
                cancelledCount++;
            }
        }

        if (cancelledCount < quantity) {
            return res.status(400).json({ message: 'Not enough active tickets to cancel' });
        }

        await event.save();

        const updatedEvent = await Event.findById(req.params.id)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .populate('cancelledAttendees', 'name email');

        // Send Cancellation Notification
        try {
            await Notification.create({
                user: req.user._id,
                type: 'cancellation',
                message: `❌ Ticket Cancelled: You successfully cancelled ${quantity} ticket(s) for ${event.title}.`
            });
        } catch (notifError) {
            console.error('Failed to create cancellation notification:', notifError);
        }

        // Send Cancellation Notification Email
        try {
            const emailHTML = `
                <h2>Cancellation Confirmed</h2>
                <p>Hi ${req.user.name},</p>
                <p>You have successfully cancelled <strong>${quantity}</strong> ticket(s) for <strong>${event.title}</strong>.</p>
                <p>If this was a mistake, you can try to rebook on the platform.</p>
                <p>Thank you!</p>
            `;
            await sendEmail({
                email: req.user.email,
                subject: `Ticket Cancelled: ${event.title}`,
                html: emailHTML,
                message: `You have successfully cancelled ${quantity} ticket(s) for ${event.title}.`
            });
        } catch (emailError) {
            console.error('Failed to send cancellation email', emailError);
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/events/:id/rebook
// @desc    Rebook cancelled tickets
// @access  Private
router.post('/:id/rebook', protect, async (req, res) => {
    try {
        const { quantity = 1 } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check seat limit
        if (event.maxAttendees && event.attendees.length + quantity > event.maxAttendees) {
            return res.status(400).json({ message: `Cannot rebook ${quantity} tickets. Only ${event.maxAttendees - event.attendees.length} seats available.` });
        }

        // Remove from cancelledAttendees, move to attendees
        let restoredCount = 0;
        for (let i = event.cancelledAttendees.length - 1; i >= 0 && restoredCount < quantity; i--) {
            if (event.cancelledAttendees[i].toString() === req.user._id.toString()) {
                event.cancelledAttendees.splice(i, 1);
                event.attendees.push(req.user._id);
                restoredCount++;
            }
        }

        if (restoredCount < quantity) {
            return res.status(400).json({ message: 'Not enough cancelled tickets to rebook' });
        }

        await event.save();

        const updatedEvent = await Event.findById(req.params.id)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .populate('cancelledAttendees', 'name email');

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/events/user/my-events
// @desc    Get events created by logged-in organizer
// @access  Private (organizer, admin)
router.get('/user/my-events', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'organizer') {
            query = { organizer: req.user._id };
        }
        // Admin sees all events

        const events = await Event.find(query)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .populate('cancelledAttendees', 'name email')
            .sort({ createdAt: -1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/events/user/my-tickets
// @desc    Get events the user has registered for
// @access  Private
router.get('/user/my-tickets', protect, async (req, res) => {
    try {
        const events = await Event.find({
            $or: [
                { attendees: req.user._id },
                { cancelledAttendees: req.user._id }
            ]
        })
            .populate('organizer', 'name email')
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

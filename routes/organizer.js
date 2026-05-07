const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/organizer/stats
// @desc    Get organizer-specific stats & analytics
// @access  Private (organizer, admin)
router.get('/stats', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };

        const myEvents = await Event.find(query)
            .populate('attendees', 'name email')
            .populate('organizer', 'name email')
            .sort({ date: -1 });

        const totalEvents = myEvents.length;
        const totalAttendees = myEvents.reduce((sum, e) => sum + (e.attendees?.length || 0), 0);
        const totalRevenue = myEvents.reduce((sum, e) => sum + ((e.price || 0) * (e.attendees?.length || 0)), 0);

        // Upcoming events
        const now = new Date();
        const upcomingEvents = myEvents.filter(e => new Date(e.date) >= now).length;
        const pastEvents = myEvents.filter(e => new Date(e.date) < now).length;

        // Best performing event
        let bestEvent = null;
        if (myEvents.length > 0) {
            bestEvent = myEvents.reduce((best, e) => {
                const rev = (e.price || 0) * (e.attendees?.length || 0);
                const bestRev = (best.price || 0) * (best.attendees?.length || 0);
                return rev > bestRev ? e : best;
            });
        }

        // Per-event performance data
        const eventPerformance = myEvents.map(e => ({
            _id: e._id,
            title: e.title,
            date: e.date,
            category: e.category,
            price: e.price,
            maxAttendees: e.maxAttendees || 100,
            attendees: e.attendees?.length || 0,
            revenue: (e.price || 0) * (e.attendees?.length || 0),
            occupancy: e.maxAttendees ? Math.round(((e.attendees?.length || 0) / e.maxAttendees) * 100) : 0,
        }));

        // Monthly revenue trend (last 6 months)
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = d.toLocaleString('default', { month: 'short' });
            const year = d.getFullYear();
            const month = d.getMonth();

            const monthEvents = myEvents.filter(e => {
                const ed = new Date(e.date);
                return ed.getMonth() === month && ed.getFullYear() === year;
            });

            const revenue = monthEvents.reduce((s, e) => s + ((e.price || 0) * (e.attendees?.length || 0)), 0);
            const bookings = monthEvents.reduce((s, e) => s + (e.attendees?.length || 0), 0);

            months.push({ month: monthStr, revenue, bookings, events: monthEvents.length });
        }

        // Category breakdown
        const catMap = {};
        myEvents.forEach(e => {
            const cat = e.category || 'General';
            if (!catMap[cat]) catMap[cat] = { name: cat, events: 0, revenue: 0, attendees: 0 };
            catMap[cat].events++;
            catMap[cat].revenue += (e.price || 0) * (e.attendees?.length || 0);
            catMap[cat].attendees += e.attendees?.length || 0;
        });

        res.json({
            totalEvents,
            totalAttendees,
            totalRevenue,
            upcomingEvents,
            pastEvents,
            bestEvent: bestEvent ? {
                title: bestEvent.title,
                revenue: (bestEvent.price || 0) * (bestEvent.attendees?.length || 0),
                attendees: bestEvent.attendees?.length || 0,
            } : null,
            eventPerformance,
            monthlyData: months,
            categoryData: Object.values(catMap),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/organizer/my-bookings
// @desc    Get all bookings for the organizer's events (flattened attendee list)
// @access  Private (organizer, admin)
router.get('/my-bookings', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };

        const events = await Event.find(query)
            .populate('attendees', 'name email')
            .populate('cancelledAttendees', 'name email')
            .sort({ date: -1 });

        const bookings = [];
        events.forEach(event => {
            (event.attendees || []).forEach(attendee => {
                bookings.push({
                    _id: `${event._id}-${attendee._id}-active`,
                    event: {
                        _id: event._id,
                        title: event.title,
                        date: event.date,
                        category: event.category,
                        location: event.location,
                    },
                    attendee: {
                        _id: attendee._id,
                        name: attendee.name,
                        email: attendee.email,
                    },
                    price: event.price || 0,
                    status: 'confirmed'
                });
            });
            (event.cancelledAttendees || []).forEach(attendee => {
                bookings.push({
                    _id: `${event._id}-${attendee._id}-cancelled`,
                    event: {
                        _id: event._id,
                        title: event.title,
                        date: event.date,
                        category: event.category,
                        location: event.location,
                    },
                    attendee: {
                        _id: attendee._id,
                        name: attendee.name,
                        email: attendee.email,
                    },
                    price: event.price || 0,
                    status: 'cancelled'
                });
            });
        });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/organizer/bookings/:eventId/attendee/:attendeeId/status
// @desc    Update a specific booking's status
// @access  Private (organizer, admin)
router.put('/bookings/:eventId/attendee/:attendeeId/status', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const { eventId, attendeeId } = req.params;
        const { status } = req.body;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const attendeeStr = attendeeId.toString();

        if (status === 'cancelled') {
            // Remove 1 occurrence from attendees, push to cancelledAttendees
            const index = event.attendees.findIndex(id => id.toString() === attendeeStr);
            if (index !== -1) {
                event.attendees.splice(index, 1);
                event.cancelledAttendees.push(attendeeId);
            }
        } else if (status === 'confirmed') {
            // Check max attendees capacity if enforcing it
            if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
                return res.status(400).json({ message: 'Event is already fully booked.' });
            }
            // Remove 1 occurrence from cancelledAttendees, push to attendees
            const index = event.cancelledAttendees.findIndex(id => id.toString() === attendeeStr);
            if (index !== -1) {
                event.cancelledAttendees.splice(index, 1);
                event.attendees.push(attendeeId);
            }
        }

        await event.save();
        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/organizer/profile
// @desc    Update organizer profile (name, email)
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (email) user.email = email;

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

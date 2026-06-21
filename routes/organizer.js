const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/organizer/stats
// @desc    Get organizer-specific stats & analytics
// @access  Private (organizer, admin)
router.get('/stats', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const organizerId = req.user.role === 'admin' ? null : new mongoose.Types.ObjectId(req.user._id);
        const matchStage = organizerId ? { $match: { organizer: organizerId } } : { $match: {} };

        const stats = await Event.aggregate([
            matchStage,
            {
                $facet: {
                    generalStats: [
                        {
                            $group: {
                                _id: null,
                                totalEvents: { $sum: 1 },
                                totalAttendees: { $sum: { $size: { $ifNull: ["$attendees", []] } } },
                                totalRevenue: {
                                    $sum: { $multiply: [{ $ifNull: ["$price", 0] }, { $size: { $ifNull: ["$attendees", []] } }] }
                                }
                            }
                        }
                    ],
                    eventPerformance: [
                        {
                            $project: {
                                title: 1,
                                date: 1,
                                category: 1,
                                price: 1,
                                maxAttendees: { $ifNull: ["$maxAttendees", 100] },
                                attendeesCount: { $size: { $ifNull: ["$attendees", []] } },
                                revenue: { $multiply: [{ $ifNull: ["$price", 0] }, { $size: { $ifNull: ["$attendees", []] } }] }
                            }
                        },
                        {
                            $project: {
                                title: 1, date: 1, category: 1, price: 1, maxAttendees: 1,
                                attendees: "$attendeesCount", revenue: 1,
                                occupancy: {
                                    $cond: [
                                        { $gt: ["$maxAttendees", 0] },
                                        { $round: [{ $multiply: [{ $divide: ["$attendeesCount", "$maxAttendees"] }, 100] }, 0] },
                                        0
                                    ]
                                }
                            }
                        }
                    ],
                    categoryData: [
                        {
                            $group: {
                                _id: { $ifNull: ["$category", "General"] },
                                events: { $sum: 1 },
                                attendees: { $sum: { $size: { $ifNull: ["$attendees", []] } } },
                                revenue: { $sum: { $multiply: [{ $ifNull: ["$price", 0] }, { $size: { $ifNull: ["$attendees", []] } }] } }
                            }
                        },
                        { $project: { name: "$_id", events: 1, attendees: 1, revenue: 1, _id: 0 } }
                    ]
                }
            }
        ]);

        const general = stats[0].generalStats[0] || { totalEvents: 0, totalAttendees: 0, totalRevenue: 0 };
        
        // Calculate monthly trends directly in DB (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);

        const monthlyStats = await Event.aggregate([
            { 
                $match: { 
                    ...(organizerId ? { organizer: organizerId } : {}),
                    date: { $gte: sixMonthsAgo }
                } 
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    revenue: { $sum: { $multiply: [{ $ifNull: ["$price", 0] }, { $size: { $ifNull: ["$attendees", []] } }] } },
                    bookings: { $sum: { $size: { $ifNull: ["$attendees", []] } } },
                    events: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Map database results back to expected frontend dashboard arrays
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() - i);
            const m = targetDate.getMonth() + 1;
            const y = targetDate.getFullYear();
            const label = targetDate.toLocaleString('default', { month: 'short' });
            
            const dbMatch = monthlyStats.find(item => item._id.month === m && item._id.year === y);
            monthlyData.push({
                month: label,
                revenue: dbMatch ? dbMatch.revenue : 0,
                bookings: dbMatch ? dbMatch.bookings : 0,
                events: dbMatch ? dbMatch.events : 0
            });
        }

        // Add bestEvent, upcomingEvents, pastEvents calculation
        const perf = stats[0].eventPerformance || [];
        let bestEvent = null;
        if (perf.length > 0) {
            const best = perf.reduce((b, e) => (e.revenue > b.revenue ? e : b), perf[0]);
            bestEvent = {
                title: best.title,
                revenue: best.revenue,
                attendees: best.attendees
            };
        }
        const now = new Date();
        const upcomingEvents = perf.filter(e => new Date(e.date) >= now).length;
        const pastEvents = perf.filter(e => new Date(e.date) < now).length;

        res.json({
            totalEvents: general.totalEvents,
            totalAttendees: general.totalAttendees,
            totalRevenue: general.totalRevenue,
            upcomingEvents,
            pastEvents,
            bestEvent,
            eventPerformance: stats[0].eventPerformance,
            categoryData: stats[0].categoryData,
            monthlyData
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

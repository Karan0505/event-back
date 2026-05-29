const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEvents = await Event.countDocuments();
        const totalOrganizers = await User.countDocuments({ role: 'organizer' });
        const totalAttendees = await User.countDocuments({ role: 'attendee' });

        // Total bookings (sum of all attendees across events)
        const events = await Event.find().select('attendees price date category createdAt');
        const totalBookings = events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0);
        const totalRevenue = events.reduce((sum, e) => sum + (e.price || 0) * (e.attendees?.length || 0), 0);

        // Monthly revenue data (last 6 months)
        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthLabel = monthStart.toLocaleString('en', { month: 'short', year: '2-digit' });

            const monthEvents = events.filter(e => {
                const d = new Date(e.date);
                return d >= monthStart && d <= monthEnd;
            });

            const revenue = monthEvents.reduce((s, e) => s + (e.price || 0) * (e.attendees?.length || 0), 0);
            const bookings = monthEvents.reduce((s, e) => s + (e.attendees?.length || 0), 0);

            monthlyData.push({ month: monthLabel, revenue, bookings, events: monthEvents.length });
        }

        // Category breakdown
        const categoryMap = {};
        events.forEach(e => {
            const cat = e.category || 'General';
            if (!categoryMap[cat]) categoryMap[cat] = { events: 0, bookings: 0, revenue: 0 };
            categoryMap[cat].events++;
            categoryMap[cat].bookings += (e.attendees?.length || 0);
            categoryMap[cat].revenue += (e.price || 0) * (e.attendees?.length || 0);
        });
        const categoryData = Object.entries(categoryMap).map(([name, data]) => ({ name, ...data }));

        // Recent signups (last 7 days)
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const recentSignups = await User.countDocuments({ createdAt: { $gte: weekAgo } });

        // Daily user activity (last 7 days)
        const dailyActivityPromises = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
            const dayLabel = dayStart.toLocaleString('en', { weekday: 'short' });
            
            dailyActivityPromises.push(
                User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } })
                    .then(signups => ({ day: dayLabel, signups }))
            );
        }
        const dailyActivity = await Promise.all(dailyActivityPromises);

        res.json({
            totalUsers,
            totalEvents,
            totalOrganizers,
            totalAttendees,
            totalBookings,
            totalRevenue,
            recentSignups,
            monthlyData,
            categoryData,
            dailyActivity,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (approve organizer, etc)
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['attendee', 'organizer', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Don't allow deleting yourself
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings across all events
router.get('/bookings', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'name email')
            .populate('attendees', 'name email')
            .sort({ date: -1 });

        // Flatten into booking records
        const bookings = [];
        events.forEach(event => {
            (event.attendees || []).forEach(attendee => {
                bookings.push({
                    _id: `${event._id}-${attendee._id}`,
                    event: { _id: event._id, title: event.title, date: event.date, category: event.category },
                    attendee: { _id: attendee._id, name: attendee.name, email: attendee.email },
                    organizer: event.organizer,
                    price: event.price || 0,
                    bookedAt: event.createdAt,
                });
            });
        });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

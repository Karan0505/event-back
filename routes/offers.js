const express = require('express');
const Offer = require('../models/Offer');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/offers
// @desc    Create a new ticket offer / promo code
// @access  Private (organizer, admin)
router.post('/', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const { code, discountPercentage, eventId } = req.body;

        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required. Please select an event.' });
        }

        // Verify event exists and user owns it (if not admin)
        const event = await Event.findById(eventId).catch(() => null);
        if (!event) {
            return res.status(404).json({ message: 'Event not found. Please select a valid event.' });
        }

        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to create offers for this event' });
        }

        const offer = await Offer.create({
            code,
            discountPercentage,
            event: eventId,
            organizer: req.user._id,
        });

        const populatedOffer = await Offer.findById(offer._id).populate('event', 'title date');

        res.status(201).json(populatedOffer);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This promo code already exists for this event' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/offers/organizer
// @desc    Get all offers created by the logged-in user
// @access  Private (organizer, admin)
router.get('/organizer', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'organizer') {
            query = { organizer: req.user._id };
        }
        // Admin sees all offers

        const offers = await Offer.find(query)
            .populate('event', 'title date location category price')
            .sort({ createdAt: -1 });

        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/offers/:id
// @desc    Delete an offer
// @access  Private (organizer, admin)
router.delete('/:id', protect, authorize('organizer', 'admin'), async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        if (offer.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this offer' });
        }

        await offer.deleteOne();
        res.json({ message: 'Offer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/offers/validate
// @desc    Validate a promo code for an event
// @access  Public / Private (Attendee during registration)
router.post('/validate', async (req, res) => {
    try {
        const { code, eventId } = req.body;

        const offer = await Offer.findOne({
            code: code.toUpperCase(),
            event: eventId
        });

        if (!offer) {
            return res.status(404).json({ message: 'Invalid or inactive promo code for this event' });
        }

        res.json({
            success: true,
            discountPercentage: offer.discountPercentage,
            code: offer.code
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/offers/event/:eventId
// @desc    Get all public offers for an event
// @access  Public
router.get('/event/:eventId', async (req, res) => {
    try {
        const offers = await Offer.find({ event: req.params.eventId })
            .select('code discountPercentage');
        res.json(offers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

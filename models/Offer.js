const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Promo code is required'],
        trim: true,
        uppercase: true,
    },
    discountPercentage: {
        type: Number,
        required: [true, 'Discount percentage is required'],
        min: 1,
        max: 100,
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

// Ensure a code is unique per event
offerSchema.index({ code: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Offer', offerSchema);

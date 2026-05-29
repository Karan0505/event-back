const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    date: {
        type: Date,
        required: [true, 'Event date is required'],
    },
    time: {
        type: String,
        required: [true, 'Event time is required'],
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
    },
    category: {
        type: String,
        required: true,
        enum: ['Technology', 'Music', 'Business', 'Sports', 'Art', 'Food', 'Movies', 'General'],
        default: 'General',
    },
    price: {
        type: Number,
        required: true,
        default: 499,
    },
    image: {
        type: String,
        default: '',
    },
    maxAttendees: {
        type: Number,
        default: 100,
    },
    bookedSeats: {
        type: [String],
        default: [],
    },
    seatsRecord: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seats: [String]
    }],
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    cancelledAttendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { timestamps: true });

eventSchema.index({ organizer: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ attendees: 1 });
eventSchema.index({ cancelledAttendees: 1 });

module.exports = mongoose.model('Event', eventSchema);

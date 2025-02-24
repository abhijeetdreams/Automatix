const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    type: String,
    eventTs: String,
    teamId: String,
    eventData: Object,
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);

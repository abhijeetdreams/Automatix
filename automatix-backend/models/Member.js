const mongoose = require("mongoose");

const memberSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    realName: String,
    email: String,
    avatar: String,
    isBot: {
        type: Boolean,
        default: false
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    profile: {
        title: String,
        phone: String,
        status: String,
        image_original: String,
        team: String
    },
    presence: {
        type: String,
        enum: ['active', 'away', 'offline'],
        default: 'offline'
    }
});

module.exports = mongoose.model("Member", memberSchema);

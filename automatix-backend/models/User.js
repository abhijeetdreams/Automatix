const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    slackUserId: {
        type: String,
        required: true,
        unique: true
    },
    firstInteraction: {
        type: Date,
        default: Date.now       
        
    }
});


module.exports = mongoose.model('User', userSchema);

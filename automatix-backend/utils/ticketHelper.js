const User = require('../models/User');

const checkUserExists = async (userId) => {
    const existingUser = await User.findOne({ slackUserId: userId });
    return existingUser;
};

const createSupportTicket = async (event) => {
    try {
        const userExists = await checkUserExists(event.user);
        
        if (userExists) {
            console.log('User already exists, skipping ticket creation');
            return null;
        }

        // Create new user record
        const newUser = new User({
            slackUserId: event.user
        });
        await newUser.save();

        const ticketData = {
            userId: event.user,
            channelId: event.channel,
            timestamp: event.ts,
            messageText: event.text,
            status: 'new'
        };
        
        // TODO: Replace with actual ticket creation API call
        console.log('Support ticket created for new user:', ticketData);
        return ticketData;
    } catch (error) {
        console.error('Error creating support ticket:', error);
        throw error;
    }
};

module.exports = { createSupportTicket };

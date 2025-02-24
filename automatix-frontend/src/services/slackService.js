import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/slack';

const slackService = {
    fetchMessages: async () => {
        try {
            const response = await axios.get(`${BASE_URL}/fetch-messages`);
            return response.data;
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    },

    sendMessage: async (message) => {
        try {
            const response = await axios.post(`${BASE_URL}/send-message`, { message });
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    fetchDMHistory: async (userId) => {
        try {
            const response = await axios.get(`${BASE_URL}/dm-history/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching DM history:', error);
            throw error;
        }
    },

    sendMessageFromUserToBot: async (botUserId, message, userId) => {
        try {
            const response = await axios.post(`${BASE_URL}/send-user-to-bot`, {
                botUserId,
                message,
                userId
            });
            return response.data;
        } catch (error) {
            console.error('Error sending message from user to bot:', error);
            throw error;
        }
    }
};

export default slackService;

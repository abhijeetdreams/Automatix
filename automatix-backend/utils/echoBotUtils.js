const Message = require("../models/Message");
const { WebClient } = require('@slack/web-api');
const slackClient = new WebClient(process.env.BOT_TOKEN);

const sendMessageback = async (userId, message) => {
    try {
        // Ensure userId and message are provided
      
        // Step 1: Find or create DM channel
           if (!userId || !message) {
               return;
           }

        const openConversation = await slackClient.conversations.open({
            users: userId,
            return_im: true
        });

        // Check if the DM channel was successfully opened
        if (!openConversation.ok) {
            throw new Error("Failed to open conversation");
        }

        const dmChannelId = openConversation.channel.id;

        // Step 2: Fetch existing messages to maintain context
        let history = [];
        try {
            history = await slackClient.conversations.history({
                channel: dmChannelId,
                limit: 100
            });

            if (!history.ok) {
                throw new Error('Failed to retrieve message history');
            }
        } catch (historyError) {
            console.error("Error fetching history:", historyError.message);
            history = []; // If fetching fails, proceed without thread context
        }

        // Step 3: Send new message with thread awareness (if any)
        const threadTs = history.messages && history.messages.length > 0 ? history.messages[0].ts : undefined;

        const result = await slackClient.chat.postMessage({
            channel: dmChannelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs // Attach to the last message in the thread (if any)
        });

        // Get bot user info (to identify the bot in the conversation)
        const botInfo = await slackClient.auth.test();
        const botUserId = botInfo.user_id;

        // Step 4: Store message in database
        const newMessage = new Message({
            text: message,
            timestamp: new Date(parseFloat(result.ts) * 1000),
            channel: dmChannelId,
            user: botUserId,
            ts: result.ts, // Slack timestamp
            thread_ts: result.message.thread_ts, // Slack thread timestamp
            userDetails: {
                name: "Bot",
                email: "bot@automatix.com"
            }
        });
        try {
            await newMessage.save();
        } catch (dbError) {
            console.error("Error saving message to DB:", dbError);
            throw new Error("Error saving message to database");
        }

        // Step 5: Mark the channel as read after sending the message
        try {
            await slackClient.conversations.mark({
                channel: dmChannelId,
                ts: result.ts
            });
        } catch (markError) {
            console.log("Mark channel error:", markError.message);
        }

        return {
            success: true,
            message: "Message sent from bot to user",
            channelId: dmChannelId,
            messageTs: result.ts,
            messageDetails: result.message,
            botUserId: botUserId
        };

    } catch (error) {
        console.error("Error sending message from bot to user:", error);
        throw {
            error: error.message,
            details: error.data || 'No additional details'
        };
    }
};

module.exports = {
    sendMessageback
};
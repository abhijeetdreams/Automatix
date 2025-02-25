const { WebClient } = require('@slack/web-api');
const slackClient = new WebClient(process.env.BOT_TOKEN);

const sendMessageback = async (userId, message, files = []) => {
    try {
        if (!userId || !message ) {
            return;
        }
        const openConversation = await slackClient.conversations.open({
            users: userId,
            return_im: true
        });

        console.log("They are files --->" , files);
        
        if (!openConversation.ok) {
            throw new Error("Failed to open conversation");
        }

        const dmChannelId = openConversation.channel.id;

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
            history = []; 
        }

        // Step 3: Send new message with thread awareness (if any)
        const threadTs = history.messages && history.messages.length > 0 ? history.messages[0].ts : undefined;

        const messagePayload = {
            channel: dmChannelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs // Attach to the last message in the thread (if any)
        };

        // Add files to the payload if they exist
        if (files && files.length > 0) {
            messagePayload.files = files;
        }

        const result = await slackClient.chat.postMessage(messagePayload);

        try {
            await slackClient.conversations.mark({
                channel: dmChannelId,
                ts: result.ts
            });
        } catch (markError) {
            console.log("Mark channel error:", markError.message);
        }

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
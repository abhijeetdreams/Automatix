const { WebClient } = require('@slack/web-api');
const slackClient = new WebClient(process.env.BOT_TOKEN);

const sendMessageback = async (userId, message = "", files = []) => {
    console.log("They are files --->", files);
    try {
        if (!userId || (!message && files.length === 0)) {
            console.log("No message or files to send.");
            return;
        }

        const openConversation = await slackClient.conversations.open({
            users: userId,
            return_im: true
        });

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
                throw new Error("Failed to retrieve message history");
            }
        } catch (historyError) {
            console.error("Error fetching history:", historyError.message);
            history = [];
        }

        // Find thread timestamp if there's an existing conversation
        const threadTs = history.messages?.length > 0 ? history.messages[0].ts : undefined;

        // Construct message content
        let fullMessage = message || ""; // If message is empty, initialize with empty string

        if (files.length > 0) {
            const fileLinksText = files.map(file => `<${file}|File>`).join("\n");
            fullMessage += `\n\nAttached files:\n${fileLinksText}`;
        }

        // If there's nothing to send, return early
        if (!fullMessage.trim()) {
            console.log("No content to send.");
            return;
        }

        const messagePayload = {
            channel: dmChannelId,
            text: fullMessage,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs // Attach to the last message in the thread (if any)
        };

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
            details: error.data || "No additional details"
        };
    }
};

module.exports = {
    sendMessageback
};
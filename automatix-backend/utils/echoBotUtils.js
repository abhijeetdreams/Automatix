const { WebClient } = require('@slack/web-api');
const slackClient = new WebClient(process.env.BOT_TOKEN);

const sendMessageback = async (userId, message, files = []) => {
    try {
        if (!userId || !message) {
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
                throw new Error('Failed to retrieve message history');
            }
        } catch (historyError) {
            console.error("Error fetching history:", historyError.message);
            history = []; // If fetching fails, proceed without thread context
        }

        // Step 3: Send new message with thread awareness (if any)
        const threadTs = history.messages && history.messages.length > 0 ? history.messages[0].ts : undefined;

        // Upload files if any
        let uploadedFiles = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await slackClient.files.upload({
                        channels: dmChannelId,
                        file: file.content,
                        filename: file.name,
                        initial_comment: "Here's the file you requested",
                        thread_ts: threadTs
                    });
                    uploadedFiles.push(result.file);
                } catch (fileError) {
                    console.error("Error uploading file:", fileError);
                }
            }
        }

        const result = await slackClient.chat.postMessage({
            channel: dmChannelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs // Attach to the last message in the thread (if any)
        });

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
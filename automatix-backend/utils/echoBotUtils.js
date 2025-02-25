const { WebClient } = require('@slack/web-api');
const fs = require('fs');
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

        const threadTs = history.messages && history.messages.length > 0 ? history.messages[0].ts : undefined;

        const messagePayload = {
            channel: dmChannelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs 
        };

        const result = await slackClient.chat.postMessage(messagePayload);
        console.log("They are files 1 -->" , files);
        if (files && files.length > 0) {
            console.log("They are files 2 -->" , files);
            
            for (const file of files) {
                console.log("They are files 3 --->" , file)
                try {
                    await slackClient.files.uploadV2({
                        channel_id: dmChannelId,
                        file: fs.createReadStream(file.path || file.url_private),
                        filename: file.name,
                        initial_comment: message || "this is message",
                        thread_ts: result.ts,
                        request_file_info: true
                    });
                    console.log("They are files 4--->" , file)
                } catch (fileError) {
                    console.error("Error uploading file:", file.name, fileError);
                }
            }
        }

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
            details: error.data || 'No additional details',
            status: error.code || 500
        };
    }
};

module.exports = {
    sendMessageback
};
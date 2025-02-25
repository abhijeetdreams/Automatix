const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const { handleSlackError } = require('./errorHandler');

const slackClient = new WebClient(process.env.BOT_TOKEN);

async function openDirectMessage(userId) {
    const conversation = await slackClient.conversations.open({
        users: userId,
        return_im: true
    });
    
    if (!conversation.ok) throw new Error("Failed to open conversation");
    return conversation.channel.id;
}

async function uploadFiles(channelId, files, message, threadTs) {
    if (!files?.length) return;

    for (const file of files) {
        try {
            await slackClient.files.uploadV2({
                channel_id: channelId,
                file: fs.createReadStream(file.path || file.url_private),
                filename: file.name,
                initial_comment: message,
                thread_ts: threadTs,
                request_file_info: true
            });
        } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
        }
    }
}

async function getLatestThreadTs(channelId) {
    try {
        const history = await slackClient.conversations.history({
            channel: channelId,
            limit: 1
        });
        
        return history.ok && history.messages.length > 0 
            ? history.messages[0].ts 
            : undefined;
    } catch (error) {
        console.error("Error fetching history:", error.message);
        return undefined;
    }
}

async function sendMessageback(userId, message, files = []) {
    // if (!userId && !message && files.length == 0 ) return;

    try {
        const channelId = await openDirectMessage(userId);
        const threadTs = await getLatestThreadTs(channelId);
        
        const messagePayload = {
            channel: channelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true,
            reply_broadcast: true,
            thread_ts: threadTs
        };

        const result = await slackClient.chat.postMessage(messagePayload);
        
        await uploadFiles(channelId, files, message, threadTs);

        try {
            await slackClient.conversations.mark({
                channel: channelId,
                ts: result.ts
            });
        } catch (error) {
            console.log("Mark channel error:", error.message);
        }

        return result;

    } catch (error) {
        throw handleSlackError(error);
    }
}

module.exports = {
    sendMessageback
};
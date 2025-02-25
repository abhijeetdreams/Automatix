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
            const fileSource = file.path 
                ? fs.createReadStream(file.path)
                : file.url_private_download;

            await slackClient.files.uploadV2({
                channel_id: channelId,
                file: fileSource,
                filename: file.name || file.title,
                initial_comment: message,
                thread_ts: threadTs,
                request_file_info: true
            });
        } catch (error) {
            console.error(`Error uploading file ${file.name || file.title}:`, error);
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
       console.log(message , files);
       
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

        
      if (message) {
        const result = await slackClient.chat.postMessage(messagePayload);
        await slackClient.conversations.mark({
            channel: channelId,
            ts: result.ts
        });
        
      }
        
        await uploadFiles(channelId, files, message, threadTs);

        // try {
            
        // } catch (error) {
        //     console.log("Mark channel error:", error.message);
        // }

        return result;

    } catch (error) {
        throw handleSlackError(error);
    }
}

module.exports = {
    sendMessageback
};
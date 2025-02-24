const { WebClient } = require('@slack/web-api');
const Message = require('../models/Message');
const Member = require('../models/Member');
const axios = require('axios');

// Create separate clients for bot and user tokens
const slackClient = new WebClient(process.env.BOT_TOKEN);
const userClient = new WebClient(process.env.USER_TOKEN);
const userToken = process.env.USER_TOKEN;
// Verify tokens are available
if (!process.env.BOT_TOKEN || !process.env.USER_TOKEN) {
    console.error('Missing required Slack tokens in environment variables');
}

const channelId = process.env.CHANNEL_ID;

let previousMembers = new Set();

const { App } = require("@slack/bolt");
const { request } = require('express');


// Initialize Slack App
const slackApp = new App({
  token: process.env.BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

exports.sendDM = async (req, res) => {
    const { userId, message, threadTs } = req.body;  // Add threadTs to request body

    if (!userId || !message) {
        return res.status(400).json({ error: "User ID and message are required" });
    }

    try {
        // Open a DM conversation
        const result = await slackClient.conversations.open({
            users: userId,
            return_im: true
        });

        const dmChannelId = result.channel.id;

        // Prepare message options
        const messageOptions = {
            channel: dmChannelId,
            text: message,
            as_user: true,
            link_names: true,
            unfurl_links: true
        };

        // Only add thread_ts if it's provided and valid
        if (threadTs) {
            try {
                // Verify the thread exists
                const threadCheck = await slackClient.conversations.replies({
                    channel: dmChannelId,
                    ts: threadTs
                });
                
                if (threadCheck.ok) {
                    messageOptions.thread_ts = threadTs;
                    messageOptions.reply_broadcast = true;
                }
            } catch (threadError) {
                console.log("Thread verification failed:", threadError.message);
                // Continue without thread if verification fails
            }
        }

        // Send message
        const messageResult = await userClient.chat.postMessage(messageOptions);
     
        // Store the message in database
        const newMessage = new Message({
            text: message,
            timestamp: new Date(parseFloat(messageResult.ts) * 1000),
            channel: dmChannelId,
            user: userId,
            ts: messageResult.ts,
            thread_ts: messageOptions.thread_ts,
            reply_broadcast: !!messageOptions.thread_ts,
            userDetails: {
                name: "User",
                email: "user@automatix.com"
            }
        });
        await newMessage.save();

        return res.status(200).json({ 
            success: true, 
            message: "DM sent successfully!",
            messageDetails: {
                ...messageResult,
                isThreadReply: !!messageOptions.thread_ts
            }
        });
    } catch (error) {
        console.error("Error sending DM:", error);
        return res.status(500).json({ 
            error: "Failed to send DM",
            details: error.message,
            responseData: error.data
        });
    }
};

// Helper function to store user info
async function storeUserInfo(userInfo) {
    try {
        await Member.findOneAndUpdate(
            { userId: userInfo.id },
            {
                userId: userInfo.id,
                name: userInfo.name,
                realName: userInfo.real_name,
                email: userInfo.profile.email,
                avatar: userInfo.profile.image_original,
                isBot: userInfo.is_bot,
                profile: {
                    title: userInfo.profile.title,
                    phone: userInfo.profile.phone,
                    status: userInfo.profile.status_text,
                    image_original: userInfo.profile.image_original,
                    team: userInfo.team_id
                },
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error storing user info:', error);
    }
}

// Helper function to store message
async function storeMessage(message, userDetails, channelInfo = {}) {
    try {
        const messageData = {
            text: message.text,
            timestamp: new Date(parseFloat(message.ts) * 1000),
            channel: message.channel,
            user: message.user,
            ts: message.ts,
            thread_ts: message.thread_ts,
            userDetails: userDetails,
            channelInfo: channelInfo,
            reactions: message.reactions || [],
            files: message.files || [],
            attachments: message.attachments || [],
            metadata: {
                eventType: message.type,
                subtype: message.subtype,
                team: message.team,
                edited: message.edited,
                isPinned: message.pinned || false
            }
        };

        await Message.findOneAndUpdate(
            { ts: message.ts },
            messageData,
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error storing message:', error);
    }
}

exports.checkNewMembers = async (req, res) => {
    try {
        const response = await slackClient.conversations.members({ channel: channelId });
        const currentMembers = new Set(response.members);
        const newMembers = [...currentMembers].filter(member => !previousMembers.has(member));
        const newMemberDetails = [];

        if (newMembers.length > 0) {
            for (const userId of newMembers) {
                try {
                    const userInfo = await slackClient.users.info({ user: userId });
                    const user = userInfo.user;
                    
                    // Store member in database
                    await Member.findOneAndUpdate(
                        { userId: user.id },
                        {
                            userId: user.id,
                            name: user.name,
                            realName: user.real_name,
                            email: user.profile.email,
                            avatar: user.profile.image_original,
                            isBot: user.is_bot,
                            profile: {
                                title: user.profile.title,
                                phone: user.profile.phone,
                                status: user.profile.status_text,
                                image_original: user.profile.image_original,
                                team: user.team_id
                            }
                        },
                        { upsert: true, new: true }
                    );

                    newMemberDetails.push({ id: userId, name: user.real_name || user.name });
                    await slackClient.chat.postMessage({
                        channel: channelId,
                        text: `Welcome <@${userId}> to the channel! 🎉`
                    });
                } catch (userError) {
                    console.log(`Failed to fetch details for user ${userId}:`, userError.message);
                }
            }
        }

        previousMembers = currentMembers;
        res.status(200).json({ message: 'Members checked successfully', newMembers: newMemberDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add new function to fetch all members
exports.getAllMembers = async (req, res) => {
    try {
        const members = await Member.find({}).sort({ joinedAt: -1 });
        res.status(200).json({ success: true, members });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    const { message } = req.body;
    try {
        const slackResponse = await slackClient.chat.postMessage({ channel: channelId, text: message });
        
        const newMessage = new Message({
            ...slackResponse.message,
            timestamp: new Date(parseFloat(slackResponse.ts) * 1000),
            userDetails: {
                name: "Bot",
                email: "bot@automatix.com"
            }
        });
        await newMessage.save();
        
        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.fetchMessages = async (req, res) => {
    try {
        try {
            await slackClient.conversations.join({ channel: channelId });
        } catch (joinError) {
            console.log("Already in channel or join failed:", joinError.message);
        }

        const result = await slackClient.conversations.history({
            channel: channelId,
            limit: 10
        });

        const userIds = [...new Set(result.messages.map(msg => msg.user))];
        const userDetails = {};
        for (const userId of userIds) {
            try {
                const userInfo = await slackClient.users.info({ user: userId });
                userDetails[userId] = {
                    name: userInfo.user.profile.real_name || userInfo.user.name,
                    email: userInfo.user.profile.email || "Email not available"
                };
            } catch (userError) {
                console.log(`Failed to fetch details for user ${userId}:`, userError.message);
                userDetails[userId] = { name: "Unknown", email: "N/A" };
            }
        }

        const bulkOps = result.messages.map(msg => ({
            updateOne: {
                filter: { ts: msg.ts },
                update: {
                    $set: {
                        ...msg,  
                        timestamp: new Date(parseFloat(msg.ts) * 1000),
                        userDetails: userDetails[msg.user] || { name: "Unknown", email: "N/A" }
                    }
                },
                upsert: true 
            }
        }));

        if (bulkOps.length > 0) {
            await Message.bulkWrite(bulkOps);
        }

        res.status(200).json({ messages: result.messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.sendMessageFromBotToUser = async (req, res) => {
    try {
        const { userId, message } = req.body;

        // Ensure userId and message are provided
        if (!userId || !message) {
            return res.status(400).json({ error: "userId and message are required" });
        }

        // Step 1: Find or create DM channel
        const openConversation = await slackClient.conversations.open({
            users: userId,
            return_im: true
        });

        // Check if the DM channel was successfully opened
        if (!openConversation.ok) {
            console.error('Failed to open conversation:', openConversation.error);
            return res.status(500).json({ error: "Failed to open conversation" });
        }

        const dmChannelId = openConversation.channel.id;

        // Step 2: Fetch existing messages to maintain context
        let history = [];
        try {
            history = await slackClient.conversations.history({
                channel: dmChannelId,
                limit: 100
            });
            console.log(history);
            

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
            return res.status(500).json({ error: "Error saving message to database" });
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

        // Respond with success details
        res.status(200).json({
            success: true,
            message: "Message sent from bot to user",
            channelId: dmChannelId,
            messageTs: result.ts,
            messageDetails: result.message,
            threadHistory: history.messages,
            botUserId: botUserId
        });

    } catch (error) {
        console.error("Error sending message from bot to user:", error);
        res.status(500).json({
            error: error.message,
            details: error.data || 'No additional details'
        });
    }
};


// Add new function to fetch DM history
exports.getDMHistory = async (req, res) => {
    try {
        const { userId } = req.params;


        // const response = await userClient.conversations.history({ user_id: userId });
         // console.log(`Messages from ${channelId}:`, response.messages);
        // const response = await userClient.conversations.list({ types: 'im' });
       
        // console.dir(response, { depth: null, colors: true });
         
        
        // First verify if the user exists and is not a bot
        let userInfo;
        try {
            const userResponse = await slackClient.users.info({ user: userId });
            userInfo = userResponse.user;
            if (userInfo.is_bot) {
                return res.status(400).json({ 
                    error: "Cannot fetch DM history with bot users",
                    details: "Direct messaging with bot users is not supported by Slack's API"
                });
            }
        } catch (userError) {
            console.error("Error fetching user info:", userError);
            return res.status(400).json({ 
                error: "Invalid user ID or user not found",
                details: userError.message
            });
        }
        const botInfo = await slackClient.auth.test();
        const botUserId = botInfo.user_id;
        // console.log("This is  the userInfo" ,  userInfo);
        
        // Try to find existing DM channel or create new one
        let dmChannelId;
        try {
            const conversationsList = await slackClient.conversations.list({
                types: 'im'
            });

            const existingDM = conversationsList.channels.find(
                channel => channel.user === userId
            );
            console.log("This is the  existing dm " ,  existingDM);
            

            if (existingDM) {
                dmChannelId = existingDM.id;
            } else {
                const openConversation = await userClient.conversations.open({
                    users: userId
                });
                console.log("Open Conversations-->",openConversation);
                
                if (!openConversation.ok) {
                    throw new Error(openConversation.error || 'Failed to open conversation');
                }
                dmChannelId = openConversation.channel.id;
            }
        } catch (channelError) {
            console.error("Error finding/creating DM channel:", channelError);
            return res.status(500).json({ 
                error: "Failed to access DM channel",
                details: channelError.message 
            });
        }

        // Fetch all messages with pagination
        let allMessages = [];
        let cursor = undefined;

        do {
            const result = await slackClient.conversations.history({
                channel: dmChannelId,
                limit: 100,
                cursor: cursor,
                inclusive: true
            });

            if (!result.ok) {
                throw new Error(result.error || 'Failed to fetch messages');
            }

            // Process messages and identify sender type
            const processedMessages = await Promise.all(result.messages.map(async (message) => {
                let sender = 'unknown';
                let userDetails = {
                    name: 'Unknown User',
                    email: 'N/A',
                    avatar: ''
                };

                if (message.user) {
                    try {
                        // Try to get user info, but handle potential errors
                        const messageUserInfo = await slackClient.users.info({ user: message.user });
                        if (messageUserInfo && messageUserInfo.user) {
                            userDetails = {
                                name: messageUserInfo.user.real_name || messageUserInfo.user.name,
                                email: messageUserInfo.user.profile.email || 'N/A',
                                avatar: messageUserInfo.user.profile.image_original || ''
                            };
                            
                            if (message.user === botUserId) {
                                sender = 'bot';
                            } else if (message.user === userId) {
                                sender = 'user';
                            }
                        }
                    } catch (userError) {
                        // If user info can't be fetched, use message.user as the name
                        console.log(`Warning: Could not fetch info for user ${message.user}:`, userError.message);
                        userDetails = {
                            name: `User (${message.user})`,
                            email: 'N/A',
                            avatar: ''
                        };
                        sender = message.user === userId ? 'user' : 
                               message.user === botUserId ? 'bot' : 'unknown';
                    }
                }

                // Store message in database regardless of user info availability
                try {
                    await storeMessage(message, userDetails, {
                        type: 'dm',
                        dmWithUser: userId,
                        sender: sender
                    });
                } catch (storeError) {
                    console.error('Error storing message:', storeError);
                }

                return {
                    id: message.client_msg_id || message.ts,
                    text: message.text,
                    sender: sender,
                    userDetails: userDetails,
                    timestamp: message.ts,
                    thread_ts: message.thread_ts,
                    hasThread: !!message.thread_ts,
                    reactions: message.reactions || [],
                    files: message.files || [],
                    attachments: message.attachments || [],
                    metadata: {
                        isEdited: !!message.edited,
                        isPinned: !!message.pinned,
                        hasReplies: !!message.reply_count && message.reply_count > 0,
                        replyCount: message.reply_count || 0
                    }
                };
            }));

            allMessages = [...allMessages, ...processedMessages];
            cursor = result.response_metadata?.next_cursor;
        } while (cursor);

        // Sort messages by timestamp
        allMessages.sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));

        res.status(200).json({
            success: true,
            channelId: dmChannelId,
            messageCount: allMessages.length,
            userInfo: userInfo,
            messages: allMessages,
            metadata: {
                hasMore: !!cursor,
                lastTimestamp: allMessages[allMessages.length - 1]?.timestamp
            }
        });

    } catch (error) {
        console.error("Error fetching DM history:", error);
        res.status(500).json({ 
            error: "Failed to fetch DM history",
            details: error.message 
        });
    }
};

exports.sendMessageFromUserToBot = async (req, res) => {
    try {
        const { botUserId, message, userId, threadTs } = req.body;

        if (!userToken || !botUserId || !message || !userId) {
            return res.status(400).json({ error: "userToken, botUserId, message, and userId are required" });
        }

        // Open a DM with the bot
        const response = await slackClient.conversations.open({ 
            users: `${userId},${botUserId}`,
            return_im: true
        });

        if (!response.channel || !response.channel.id) {
            return res.status(500).json({ error: "Failed to open DM with the bot" });
        }

        const dmChannelId = response.channel.id;

        // If threadTs is provided, fetch that specific thread
        let threadMessages = [];
        if (threadTs) {
            const threadResponse = await slackClient.conversations.replies({
                channel: dmChannelId,
                ts: threadTs,
                limit: 100
            });
            threadMessages = threadResponse.messages;
        }

        // Send message as user, either in thread or as new message
        const result = await userClient.chat.postMessage({
            channel: dmChannelId,
            text: message,
            as_user: false,
            thread_ts: threadTs || undefined, // Use provided threadTs if available
            link_names: false,
            unfurl_links: false
        });

        // Store message in database with thread information
        const newMessage = new Message({
            text: message,
            timestamp: new Date(parseFloat(result.ts) * 1000),
            channel: dmChannelId,
            user: userId,
            ts: result.ts,
            thread_ts: threadTs || result.ts, // Use threadTs if it's a reply, or the message ts if it's a new thread
            isThreadReply: !!threadTs,
            threadMessages: threadMessages,
            userDetails: {
                name: "User",
                email: "user@automatix.com"
            }
        });
        await newMessage.save();

        res.status(200).json({ 
            success: true, 
            message: "Message sent from user to bot", 
            response: result,
            messageDetails: {
                channelId: dmChannelId,
                messageTs: result.ts,
                threadTs: threadTs || result.ts,
                threadMessages: threadMessages
            }
        });
    } catch (error) {
        console.error("Error sending message from user to bot:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getThreadMessages = async (req, res) => {
    const { channelId, threadTs } = req.query;

    if (!channelId || !threadTs) {
        return res.status(400).json({ error: "channelId and threadTs are required." });
    }

    try {
        const response = await axios.get("https://slack.com/api/conversations.replies", {
            headers: { Authorization: `Bearer ${process.env.BOT_TOKEN}` },
            params: { channel: channelId, ts: threadTs }
        });

        if (response.data.ok) {
            return res.json({ messages: response.data.messages });
        } else {
            return res.status(400).json({ error: response.data.error });
        }
    } catch (error) {
        console.error("Error fetching thread messages:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.getSlackUsersWithDMs = async (req, res) => {
    try {
        // Get bot info to filter DMs
        const botInfo = await slackClient.auth.test();
        const botUserId = botInfo.user_id;

        // Get list of all DM channels
        const conversationsResponse = await slackClient.users.conversations({
            types: 'im',
            exclude_archived: true
        });

        if (!conversationsResponse.channels) {
            return res.status(200).json({ users: [] });
        }

        const usersWithMessages = [];

        // Process each DM channel
        for (const channel of conversationsResponse.channels) {
            try {
                // Get user info
                const userInfo = await slackClient.users.info({
                    user: channel.user
                });

                // Get messages from this DM channel
                const messageHistory = await slackClient.conversations.history({
                    channel: channel.id,
                    limit: 100 // Adjust this number as needed
                });

                if (messageHistory.messages && messageHistory.messages.length > 0) {
                    usersWithMessages.push({
                        userId: channel.user,
                        userInfo: userInfo.user,
                        dmChannelId: channel.id,
                        lastMessage: messageHistory.messages[0],
                        messageCount: messageHistory.messages.length,
                        messages: messageHistory.messages
                    });
                }
            } catch (error) {
                console.error(`Error processing channel ${channel.id}:`, error);
            }
        }

        res.status(200).json({
            success: true,
            users: usersWithMessages
        });

    } catch (error) {
        console.error('Error fetching users with DMs:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUserToBotMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get bot info
        const botInfo = await slackClient.auth.test();
        const botUserId = botInfo.user_id;

        // Open DM channel between user and bot
        const openConversation = await slackClient.conversations.open({
            users: `${userId},${botUserId}`,
            return_im: true
        });

        if (!openConversation.ok || !openConversation.channel.id) {
            return res.status(404).json({ 
                success: false, 
                error: "No DM channel found between user and bot" 
            });
        }

        const dmChannelId = openConversation.channel.id;

        // Get message history
        let allMessages = [];
        let cursor = undefined;

        do {
            const result = await slackClient.conversations.history({
                channel: dmChannelId,
                limit: 100,
                cursor: cursor
            });

            // Filter messages sent by the user (not the bot)
            const userMessages = result.messages.filter(msg => msg.user === userId);
            allMessages = [...allMessages, ...userMessages];

            cursor = result.response_metadata?.next_cursor;
        } while (cursor);

        // Get user info for additional context
        const userInfo = await slackClient.users.info({
            user: userId
        });

        res.status(200).json({
            success: true,
            userInfo: userInfo.user,
            channelId: dmChannelId,
            messageCount: allMessages.length,
            messages: allMessages.map(msg => ({
                text: msg.text,
                timestamp: msg.ts,
                thread_ts: msg.thread_ts,
                reactions: msg.reactions || [],
                files: msg.files || [],
                attachments: msg.attachments || []
            }))
        });

    } catch (error) {
        console.error('Error fetching user-to-bot messages:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

exports.handleBotEvents = async (req, res) => {
    try {
        const event = req.body.event;
        if (event.type === 'message') {
            const message = event;

            // Make sure it's a direct message to the bot
            if (message.channel_type === 'im') {
                // Get user info
                const userInfo = await slackClient.users.info({
                    user: message.user
                });

                // Create response object
                const messageData = {
                    userId: message.user,
                    userInfo: {
                        name: userInfo.user.real_name || userInfo.user.name,
                        email: userInfo.user.profile.email,
                        avatar: userInfo.user.profile.image_original
                    },
                    message: {
                        text: message.text,
                        timestamp: message.ts,
                        thread_ts: message.thread_ts,
                        channelId: message.channel
                    }
                };

                // Store user info
                await storeUserInfo(userInfo.user);

                // Store message with complete data
                await storeMessage(message, {
                    name: userInfo.user.real_name || userInfo.user.name,
                    email: userInfo.user.profile.email
                }, {
                    type: 'im',
                    channelType: message.channel_type
                });

                return res.status(200).json({
                    success: true,
                    data: messageData
                });
            }
        }

        // Return success for other event types
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error handling bot event:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




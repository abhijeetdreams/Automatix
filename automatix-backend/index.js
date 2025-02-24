require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');
const { createEventAdapter } = require("@slack/events-api");
const Message = require('./models/Message');

connectDB();

const app = express()
const port = process.env.PORT;

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

app.use("/api/slack/events", slackEvents.expressMiddleware());
app.use(cors())
app.get("/api/slack/ping", (req, res, next) => {
    res.json({ message: "Server Started" });
});

slackEvents.on("message", async (event) => {
  try {
    if (event.thread_ts) {
      const messageData = {
        type: "message",
        subtype: event.subtype || "",
        text: event.text,
        channel: event.channel,
        channel_type: event.channel_type,
        timestamp: event.ts,
        event_ts: event.event_ts,
        thread_ts: event.thread_ts,
        raw_event: {
          ...event,
          root: event.thread_ts ? {
            user: event.user,
            type: "message",
            ts: event.thread_ts,
            text: event.text,
            thread_ts: event.thread_ts,
            blocks: event.blocks || [],
            reply_count: event.reply_count,
            reply_users_count: event.reply_users_count,
            latest_reply: event.ts,
            reply_users: event.reply_users || [],
            is_locked: false
          } : undefined
        },
        files: event.files || [],
        reactions: event.reactions || []
      };

      const message = new Message(messageData);
      await message.save();
      console.log('Complete message data saved to database');
    }
  } catch (error) {
    console.error('Error saving message:', error);
  }
});

slackEvents.on("reaction_added", async (event) => {
  console.log(`User ${event.user} added ${event.reaction} to ${event.item.ts}`);
});

slackEvents.on("error", console.error);

app.use(express.json());
app.use('/api/slack', slackRoutes);

app.listen(port, () => {
    console.log(`Server running on the port ${port} v1.1`);
});
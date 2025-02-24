require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');
const { createEventAdapter } = require("@slack/events-api");
const Message = require('./models/Message');
const { createSupportTicket } = require('./utils/ticketHelper');

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
   if (event.thread_ts && !event.channel_type == "") {
      await createSupportTicket(event);
      const message = new Message({
        ...event,       
        raw_event: event,  
        timestamp: event.ts
      });

      await message.save();
    }
  
    console.log('Complete message data saved to database');
  } catch (error) {
    console.error('Error processing message:', error);
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
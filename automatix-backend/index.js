require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');
const { createEventAdapter } = require("@slack/events-api");
const Message = require('./models/Message');
const { sendMessageback } = require('./utils/echoBotUtils');


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
      const userMessages = await Message.countDocuments({user: event.user});
      if (userMessages == 0) {
        console.log("Ticket Created for the user  " + event.user);
      }

      // Handle files if present
      let files = [];
      if (event.files && event.files.length > 0) {
        files = event.files.map(file => ({
          name: file.name,
          content: file.url_private
        }));
      }

      await sendMessageback(event.user, event.text, files);
  
      const message = new Message({
        ...event,       
        raw_event: event,  
        timestamp: event.ts
      });

      await message.save();
    }
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
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const slackRoutes = require("./routes/slackRoutes");
const slackEventsHandler = require("./utils/SlackEvents");
const { createEventAdapter } = require("@slack/events-api");
const router = require("./routes/SlackConfigRoute");
const Slackbot = require("./models/slackbot");

connectDB();

const app = express();
const port = process.env.PORT;

const SlackEventsHandler = async () => {
  try {
    const slackBot = await Slackbot.findById("67c009608d1abbc2baee4f16");
    
    if (!slackBot) {
      console.error('No active Slackbot configuration found');
      return null;
    }

    if (!slackBot.signingSecret) {
      console.error('Signing secret is missing in Slackbot configuration');
      return null;
    }

    const slackEvents = createEventAdapter(slackBot.signingSecret);
    
    slackEventsHandler(slackEvents);
    console.log(`Slack events endpoint configured: /api/${slackBot._id}`);
    
    app.use(`/api/${slackBot._id}`, slackEvents.expressMiddleware());
    return slackBot;
  } catch (error) {
    console.error('Error setting up Slack Events Handler:', error);
    return null;
  }
};

(async () => {
  try {
    const bot = await SlackEventsHandler();
    if (!bot) {
      console.error('Failed to initialize Slack Events Handler');
    }
  } catch (error) {
    console.error('Failed to start Slack Events Handler:', error);
  }
})();

app.use(cors());
app.get("/api/slack/ping", (req, res, next) => {
  res.json({ message: "Server Started" });
});

app.use(express.json());
app.use("/api/slack", slackRoutes);
app.use("/api/config", router);

app.listen(port, () => {
  console.log(`Server running on the port ${port} v1.1`);
});

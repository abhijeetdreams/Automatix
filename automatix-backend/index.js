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
  const slackBot = await Slackbot.findById("67c009608d1abbc2baee4f16");
  const slackEvents = createEventAdapter(slackBot.signingSecret);
  slackEventsHandler(slackEvents);
  app.use(`/api/slack/events/${slackBot._id}`, slackEvents.expressMiddleware());
  return slackBot;
};

(async () => {
  await SlackEventsHandler();
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

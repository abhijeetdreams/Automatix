require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const slackRoutes = require("./routes/slackRoutes");
const router = require("./routes/SlackConfigRoute");
const setupSlackEvents = require("./utils/slackEventSetup");

connectDB();

const app = express();
const port = process.env.PORT;

// Setup Slack events
setupSlackEvents(app, process.env.SLACK_SIGNING_SECRET, "67c009608d1abbc2baee4f16");

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

require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');
const { createEventAdapter } = require("@slack/events-api");



connectDB();

const app = express()
const port = process.env.PORT;

app.use(express.json());
app.use(cors())

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

// Middleware for parsing JSON
app.use("/api/slack/events", slackEvents.expressMiddleware());
app.get("/api/slack/ping", (req, res, next) => {
    res.json({ message: "Server Started" });
});
// Listen for message events
slackEvents.on("message", async (event) => {
  console.log(`Received a message: ${event.text}`);
});

// Listen for reaction events
slackEvents.on("reaction_added", async (event) => {
  console.log(`User ${event.user} added ${event.reaction} to ${event.item.ts}`);
});

// Error handling
slackEvents.on("error", console.error);







app.use('/api/slack', slackRoutes);

app.listen(port, () => {
    console.log(`Server running on the port ${port} v1.1`);
});
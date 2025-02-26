require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');
const slackEventsHandler = require('./utils/SlackEvents')
const { createEventAdapter } = require("@slack/events-api");



connectDB();

const app = express()
const port = process.env.PORT;

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
slackEventsHandler(slackEvents);

app.use("/api/slack/events", slackEvents.expressMiddleware());
app.use(cors())
app.get("/api/slack/ping", (req, res, next) => {
    res.json({ message: "Server Started" });
});


app.use(express.json());
app.use('/api/slack', slackRoutes);

app.listen(port, () => {
    console.log(`Server running on the port ${port} v1.1`);
});


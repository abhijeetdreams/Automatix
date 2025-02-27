const { createEventAdapter } = require("@slack/events-api");
const slackEventsHandler = require("./SlackEvents");

const setupSlackEvents = (app, signingSecret, botId) => {
    const slackEvents = createEventAdapter(signingSecret);
    app.use(`/api/slack/events/${botId}`,  slackEvents.expressMiddleware());
    slackEventsHandler(slackEvents);
    return slackEvents;
};

module.exports = setupSlackEvents;

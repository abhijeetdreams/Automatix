const express = require('express');
const router = express.Router();
const slackController = require('../controllers/slackController');
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_SIGNING_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

router.get('/check-members', slackController.checkNewWorkspaceMembers);
router.post('/send-message', slackController.sendMessage);
router.post("/send-dm" , slackController.sendDM);
router.post('/send-message-bot',slackController.sendMessageFromUserToBot);
router.get('/fetch-messages', slackController.fetchMessages);
router.post('/send-user-message' ,slackController.sendMessageFromBotToUser);
router.get('/members', slackController.getAllMembers);
router.get('/dm-history/:userId', slackController.getDMHistory);
router.post('/bot-events', slackController.handleBotEvents);
router.get('/threads' , slackController.getThreadMessages);
router.get('/messages' , slackController.getMessages);
router.get("/api/auth/slack/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Authorization code not found");

    try {
        // Exchange the code for an access token
        const response = await axios.post("https://slack.com/api/oauth.v2.access", null, {
            params: {
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code,
                redirect_uri: REDIRECT_URI,
            },
        });

        const data = response.data;
        if (!data.ok) return res.status(400).send(`Error: ${data.error}`);

        // Store token (Replace this with DB storage)
        slackTokens[data.team.id] = {
            access_token: data.access_token,
            authed_user: data.authed_user.id,
        };

        console.log("Slack Auth Success:", slackTokens);

        // Redirect back to frontend with team ID
        res.redirect(`${FRONTEND_URL}/slack-success?team_id=${data.team.id}`);
    } catch (error) {
        console.error("Slack OAuth Error:", error);
        res.status(500).send("Internal Server Error");
    }
});



module.exports = router;

const express = require('express');
const router = express.Router();
const slackController = require('../controllers/slackController');

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



module.exports = router;

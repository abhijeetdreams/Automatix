const mongoose = require("mongoose");

const slackbotSchema = new mongoose.Schema({
 name: {
    type: String,
    required: true,
  },

  botToken: {
    type: String,
    required: [true, "Bot token is required"],
    trim: true,
  },
  userToken: {
    type: String,
    required: [true, "User token is required"],
    trim: true,
  },
  signingSecret: {
    type: String,
    required: [true, "Signing secret  is required"],
    trim: true,
  },
  eventUrl : {
    type : String ,
    trim :  true
  }
});

const Slackbot = mongoose.model("Slackbot", slackbotSchema);
module.exports = Slackbot;

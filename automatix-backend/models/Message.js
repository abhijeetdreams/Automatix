const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  ts: String,
  thread_ts: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  channel: String,
  userDetails: {
    name: String,
    email: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);

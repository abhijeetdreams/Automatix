const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  type: String,
  subtype: String,
  text: String,
  user: String,
  team: String,
  channel: String,
  channel_type: String,
  timestamp: String,
  event_ts: String,
  thread_ts: String,
  blocks: [{
    type: { type: String },
    block_id: String,
    elements: mongoose.Schema.Types.Mixed
  }],
  files: [{
    id: String,
    name: String,
    filetype: String,
    url_private: String,
    permalink: String,
    mimetype: String,
    size: Number
  }],
  edited: {
    user: String,
    ts: String
  },
  reactions: [{
    name: String,
    users: [String],
    count: Number
  }],
  raw_event: mongoose.Schema.Types.Mixed // Store the complete raw event
}, { timestamps: true });


module.exports = mongoose.model("Message", messageSchema);

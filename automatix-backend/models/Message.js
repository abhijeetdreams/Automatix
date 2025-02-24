const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
  type: String,
  subtype: String,
  text: String,
  channel: String,
  channel_type: String,
  timestamp: String,
  event_ts: String,
  thread_ts: String,
  raw_event: {
    subtype: String,
    bot_id: String,
    thread_ts: String,
    root: {
      user: String,
      type: String,
      ts: String,
      bot_id: String,
      app_id: String,
      text: String,
      team: String,
      bot_profile: {
        id: String,
        deleted: Boolean,
        name: String,
        updated: Number,
        app_id: String,
        icons: {
          image_36: String,
          image_48: String,
          image_72: String
        },
        team_id: String
      },
      thread_ts: String,
      reply_count: Number,
      reply_users_count: Number,
      latest_reply: String,
      reply_users: [String],
      is_locked: Boolean,
   
    },
    type: String,
    ts: String,
    app_id: String,
    text: String,
    channel: String,
    event_ts: String,
    channel_type: String
  },
  files: Array,
  reactions: Array,
  user: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);

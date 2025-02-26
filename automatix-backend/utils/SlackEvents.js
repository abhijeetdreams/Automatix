const Message = require("../models/Message");
const sendMessageback = require("../utils/echoBotUtils");

const  slackEventsHandler = (slackEvents)=>{
    slackEvents.on("message", async (event) => {
        try {
          if (event.thread_ts && !event.channel_type == "") {
            const userMessages = await Message.countDocuments({user: event.user});
            if (userMessages == 0) {
              console.log("Ticket Created for the user  " + event.user);
            }
          
            await sendMessageback(event.user, event.text, event.files);
        
            const message = new Message({
              ...event,       
              raw_event: event,  
              timestamp: event.ts
            });
      
            await message.save();
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
      
      slackEvents.on("reaction_added", async (event) => {
        console.log(`User ${event.user} added ${event.reaction} to ${event.item.ts}`);
      });
      
      slackEvents.on("error", console.error);
}

module.exports = slackEventsHandler;

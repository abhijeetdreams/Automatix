const Slackbot = require("../models/slackbot");


const createEventUrl = (id) =>{
  const url = `https://automatix.onrender.com/api/slack/event/${id}`
  return url;
}



module.exports = {createEventUrl};

const addConfigurations = async (req, res, next) => {
  const { name, botToken, userToken, signingSecret } = req.body;
  try {
 const data = await Slackbot.create({
      name,
      botToken,
      userToken,
      signingSecret,
    });
    const url =  createEventUrl(data._id);
    const dataWithEvent =  await Slackbot.findByIdAndUpdate(data._id , {eventUrl : url}).lean();
    res.json({ data:   {...dataWithEvent ,  eventUrl : url }});
  } catch (error) {
    next(error);
  }
};


  module.exports =  {addConfigurations};
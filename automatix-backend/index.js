require('dotenv').config()
const express = require("express");
const cors = require('cors');
const connectDB = require('./config/db');
const slackRoutes = require('./routes/slackRoutes');



connectDB();

const app = express()
const port = process.env.PORT;

app.use(express.json());
app.use(cors())







app.use('/api/slack', slackRoutes);

app.listen(port, () => {
    console.log(`Server running on the port ${port}`);
});
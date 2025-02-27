const {addConfigurations } = require("../controllers/SlackConfigs");


const router  = require("express").Router();

router.post("/add" , addConfigurations);

module.exports  = router;
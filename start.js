const mongoose = require("mongoose");

//environment variables for variables.env file
require("dotenv").config({ path: "variables.env" });

//connect to Database and handle any bad connections
mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise; //use ES6 promises
mongoose.connection.on("error", error => {
  console.log(error.message);
});

//import models --only need to do once per model
require("./models/Sauce.js");
require("./models/User.js");

//Start the app
const app = require("./app.js");
app.set("port", process.env.PORT || 8080);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running on PORT ${server.address().port}`);
});

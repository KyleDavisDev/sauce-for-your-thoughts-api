// const mongoose = require("mongoose");

// environment variables for variables.env file
require("dotenv").config({ path: "variables.env" });

// connect to Database and handle any bad connections
// mongoose.connect(process.env.DATABASE, {
//   useNewUrlParser: true,
//   useCreateIndex: true
// });
// mongoose.Promise = global.Promise; // use ES6 promises
// mongoose.connection.on("error", error => {
//   console.log(error.message);
// });

// Surpress error
// mongoose.set("useCreateIndex", true);

// import models --only need to do once per model
// require("./models/Sauce.js");
// require("./models/User.js");
// require("./models/Review.js");
// require("./models/Pepper.js");
// require("./models/Type.js");
const Users = require("./models/Users");

var db = require("./db/db.js");

db.connect(async function(err) {
  if (err) throw err;
  console.log("You are now connected...");
  await Users.insert(
    {
      email: "test@gmail",
      password: "123123123",
      displayName: "Test Guy"
    },
    function(err, res) {
      if (err) throw err;
      console.log(err, res);
    }
  );
  // // Start the app
  // const app = require("./app.js");
  // app.set("port", process.env.PORT || 8080);
  // const server = app.listen(app.get("port"), () => {
  //   console.log(`Express running on PORT ${server.address().port}`);
  // });
});

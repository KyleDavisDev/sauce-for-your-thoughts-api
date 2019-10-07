// environment variables for variables.env file
require("dotenv").config({ path: "variables.env" });

var DB = require("./db/db.js");

DB.connect(function(err) {
  if (err) throw err;
  console.log("You are now connected...");

  // Start the app
  const app = require("./app.js");
  app.set("port", process.env.PORT || 8080);
  const server = app.listen(app.get("port"), () => {
    console.log(`Express running on PORT ${server.address().port}`);
  });
});

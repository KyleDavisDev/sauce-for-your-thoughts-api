// environment variables for variables.env file
require("dotenv").config({ path: "variables.env" });

var DB = require("./db/db.js");

DB.connect(function(err) {
  if (err) throw err;
  console.log("You are now connected...");

  // Start the app
  const app = require("./app.js");
  if (process.env.NODE_END === "dev") {
    app.set("port", process.env.DEV_PORT || 8080);
  } else if (process.env.NODE_END === "prod") {
    app.set("port", process.env.PROD_PORT || 8080);
  }
  const server = app.listen(app.get("port"), () => {
    console.log(`Express running on PORT ${server.address().port}`);
  });
});

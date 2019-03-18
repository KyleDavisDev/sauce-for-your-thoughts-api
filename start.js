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

var mysql = require("mysql");

var connection = mysql.createConnection({
  host: "SG-SauceForYourThoughts-290-master.servers.mongodirector.com",
  user: "Testerino",
  password: "abcasd!@asdDFasdf12",
  database: "Harriot",
  port: 3306
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("You are now connected...");

  connection.query(
    `CREATE TABLE IF NOT EXISTS Orders123 (
      OrderID int NOT NULL AUTO_INCREMENT,
      OrderNumber int NOT NULL,
      PersonID int,
      PRIMARY KEY (OrderID)
      );`,
    function(err, result) {
      if (err) throw err;
      connection.query(
        "INSERT INTO Orders123 (OrderNumber, PersonID) VALUES (?, ?)",
        [41, 14],
        function(err, result) {
          if (err) throw err;
          connection.query("SELECT * FROM Orders123", function(err, results) {
            if (err) throw err;
            console.log(results[0].OrderNumber);
          });
        }
      );
    }
  );
});

// Start the app
// const app = require("./app.js");
// app.set("port", process.env.PORT || 8080);
// const server = app.listen(app.get("port"), () => {
//   console.log(`Express running on PORT ${server.address().port}`);
// });

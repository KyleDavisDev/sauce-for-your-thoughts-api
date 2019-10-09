const express = require("express");
const routes = require("./routes/routes.js");
const requestIp = require("request-ip");
const BigBrother = require("./models/BigBrother");

//create express app
const app = express();

//serves up static files from distribution and images folder.
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));
app.use("/public/avatars", express.static(__dirname + "/public/avatars"));

// Allow cross origin
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// inside middleware handler
const ipMiddleware = async function(req, res, next) {
  try {
    // Don't bother if just getting options
    if (req.method !== "OPTIONS") {
      const clientIp = requestIp.getClientIp(req);
      const rows = await BigBrother.Insert({ IP: clientIp, Action: "test" });
    }
  } catch (err) {
    console.log(err);
  }

  // res.on("finish", function() {
  //   console.log("after");
  // });

  next();
};

app.use(ipMiddleware);

// takes raw requests and attaches them to req.body for use later
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//handle routes
app.use("/", routes);

module.exports = app;

const express = require("express");
const routes = require("./routes/routes.js");
var useragent = require("express-useragent");
var cookieParser = require("cookie-parser");

const BigBrotherMiddleware = require("./middleware/BigBrotherMiddleware");
const CrossOriginMiddleware = require("./middleware/CrossOriginMiddleware");

//create express app
const app = express();

// get user info. Attaches to req.useragent
app.use(useragent.express());

// Allow cross origin
app.use(CrossOriginMiddleware);

// Start recording what person is doing
app.use(BigBrotherMiddleware);

// Make handling cookies easier
app.use(cookieParser());

//serves up static files from distribution and images folder.
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));
app.use("/public/avatars", express.static(__dirname + "/public/avatars"));

// takes raw requests and attaches them to req.body for use later
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//handle routes
app.use("/", routes);

module.exports = app;

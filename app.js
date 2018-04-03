const express = require("express");
const expressValidator = require("express-validator");
// const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const routes = require("./routes/routes.js");
const passport = require("passport");
require("./handlers/passport.js");

//create express app
const app = express();

//serves up static files from distribution and images folder.
//app.use("public", express.static(path.join(__dirname, "uploads")));
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));
app.use("/public/avatars", express.static(__dirname + "/public/avatars"));

// takes raw requests and attaches them to req.body for use later
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Provides methods for validating data. Used mostly in userController.validateRegister
app.use(expressValidator());

// Passport JS is what we use to handle our logins
app.use(passport.initialize());
app.use(passport.session());

//handle routes
app.use("/", routes);

module.exports = app;

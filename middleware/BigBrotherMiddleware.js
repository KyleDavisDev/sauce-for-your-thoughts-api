const BigBrother = require("../models/BigBrother");
const requestIp = require("request-ip");
const moment = require("moment");

// Middleware for BigBrother to see what's going on.
const BigBrotherMiddleware = async function(req, res, next) {
  // Don't bother if just getting options
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    // Get IP
    const clientIp = requestIp.getClientIp(req);

    // get method
    const Method = req.method;

    // Insert into Big Brother
    const BigBrotherID = await BigBrother.Insert({
      IP: clientIp,
      Action: "initiate request",
      Method
    });

    // Save ID to locals for later
    res.locals.BigBrotherID = BigBrotherID;
  } catch (err) {
    console.log(err);
  }

  // When request ends
  res.on("finish", async function() {
    try {
      // Try to find a userID, sauceID, reviewID
      let UserID = req.body && req.body.user ? req.body.user.UserID : 0;
      if (!UserID) {
        // try another place
        UserID = res.locals.UserID;
      }

      let BigBrotherID = res.locals.BigBrotherID;

      const EndDate = moment().unix();

      const Action = req.originalUrl;

      // Insert into Big Brother
      const rows = await BigBrother.Update({
        BigBrotherID,
        UserID,
        EndDate,
        Action
      });
    } catch (err) {
      console.log(err);
    }
  });

  next();
};

module.exports = BigBrotherMiddleware;

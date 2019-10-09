const BigBrother = require("../models/BigBrother");
const requestIp = require("request-ip");

// Middleware for BigBrother to see what's going on.
const BigBrotherMiddleware = async function(req, res, next) {
  try {
    // Don't bother if just getting options
    if (req.method !== "OPTIONS") {
      // Get IP
      const clientIp = requestIp.getClientIp(req);

      // Insert into Big Brother
      const BigBrotherID = await BigBrother.Insert({
        IP: clientIp,
        Action: "initiate request"
      });

      // Save ID to locals for later
      res.locals.BigBrotherID = BigBrotherID;
    }
  } catch (err) {
    console.log(err);
  }

  // When request ends
  res.on("finish", async function() {
    try {
      // Insert into Big Brother
      const rows = await BigBrother.FinishRecord({
        BigBrotherID: res.locals.BigBrotherID
      });
    } catch (err) {
      console.log(err);
    }
  });

  next();
};

module.exports = BigBrotherMiddleware;

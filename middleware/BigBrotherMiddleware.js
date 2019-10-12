const BigBrother = require("../models/BigBrother");
const Users = require("../models/Users");
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
      // Find UserID from req and res
      const UserID = await findUserID(req, res);

      // Find SauceID from req and res
      const SauceID = findSauceID(req, res);

      let BigBrotherID = res.locals.BigBrotherID;

      const EndDate = moment().unix();

      const Action = req.originalUrl;

      // Insert into Big Brother
      const rows = await BigBrother.Update({
        BigBrotherID,
        UserID,
        EndDate,
        Action,
        SauceID
      });
    } catch (err) {
      console.log(err);
    }
  });

  next();
};

/** @description Find the UserID
 *  @param {Object} res - response object from express
 *  @param {Object} req - request object from express
 *  @return {Number|null}
 */
async function findUserID(req, res) {
  // Try to find a userID, sauceID, reviewID
  let UserID = req.body && req.body.user ? req.body.user.UserID : null;
  if (!UserID) {
    // try another place
    UserID = res.locals.UserID;
  }

  // If we actually have something, return now.
  if (UserID && UserID !== null) {
    return UserID;
  }

  // If UserID still not defined, see if we can find an email and turn that into an ID
  if (!UserID) {
    // maybe we have email?
    let Email = res.locals.Email;

    if (Email) {
      // convert Email to UserID
      UserID = await Users.FindUserIDByUnique({ Email });

      return UserID;
    }
  }

  return UserID;
}

/** @description Find the SauceID
 *  @param {Object} res - response object from express
 *  @param {Object} req - request object from express
 *  @return {Number|null}
 */
async function findSauceID(req, res) {
  // first attempt on req.body
  let SauceID = req.body && req.body.sauce ? req.body.sauce.SauceID : null;
  if (!SauceID) {
    // try another place
    SauceID = res.locals.SauceID;
  }

  // If we actually have something, return now.
  if (SauceID && SauceID !== null) {
    return SauceID;
  }

  return SauceID;
}

module.exports = BigBrotherMiddleware;

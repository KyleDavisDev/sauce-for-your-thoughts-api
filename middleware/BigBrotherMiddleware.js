const BigBrother = require("../models/BigBrother");
const Users = require("../models/Users");
const Sauces = require("../models/Sauces");
const Reviews = require("../models/Reviews");
const requestIp = require("request-ip");
const moment = require("moment");

// kill switch to monitor traffic or not
const USE_BIG_BROTHER = false;

// Middleware for BigBrother to see what's going on.
const BigBrotherMiddleware = async function(req, res, next) {
  // Kill switch
  if (!USE_BIG_BROTHER) {
    return next();
  }

  // Don't bother if just getting options
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    // Get IP
    const clientIp = requestIp.getClientIp(req);

    // get method
    const Method = req.method;

    const Action = req.originalUrl;

    // Insert into Big Brother
    const BigBrotherID = await BigBrother.Insert({
      IP: clientIp,
      Action,
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
      // Look for UserID from req and res
      const UserID = await findUserID(req, res);

      // Look for SauceID from req and res
      const SauceID = await findSauceID(req, res);

      // Look for ReviewID from req and res
      const ReviewID = await findReviewID(req, res);

      let BigBrotherID = res.locals.BigBrotherID;

      const EndDate = moment().unix();

      // Insert into Big Brother
      const rows = await BigBrother.Update({
        BigBrotherID,
        UserID,
        EndDate,
        SauceID,
        ReviewID
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
 *  @return {Promise}
 *  @resolves {Number|null}
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
 *  @return {Promise}
 *  @resolves {Number|null}
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

  // if still nothing, look for slug on res.locals to convert to an ID
  if (res.locals.SauceSlug) {
    const Slug = res.locals.SauceSlug;
    SauceID = await Sauces.FindSauceIDFromUniques({ Slug });
  }

  return SauceID;
}

/** @description Find the ReviewID
 *  @param {Object} res - response object from express
 *  @param {Object} req - request object from express
 *  @returns {Promise}
 *  @resolves {Number|null}
 */
async function findReviewID(req, res) {
  // first attempt on req.body
  let ReviewID = req.body && req.body.review ? req.body.review.ReviewID : null;
  if (!ReviewID) {
    // try another place
    ReviewID = res.locals.ReviewID;
  }

  // If we actually have something, return now.
  if (ReviewID && ReviewID !== null) {
    return ReviewID;
  }

  // check if we can get the ID based on other ID's
  const UserID = res.locals.UserID;
  const SauceID = res.locals.SauceID;
  if (SauceID && UserID) {
    ReviewID = await Reviews.FindReviewIDFromUniques({ SauceID, UserID });
  }

  return ReviewID;
}

module.exports = BigBrotherMiddleware;

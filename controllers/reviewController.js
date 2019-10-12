const Reviews = require("../models/Reviews.js");
const Sauces = require("../models/Sauces.js");
const Users = require("../models/Users.js");
const validator = require("validator");
const Utility = require("../utility/utility");

// Constants
const MAXLENGTH = 300;

exports.validateReview = (req, res, next) => {
  try {
    // max length for txt inputs

    // Remove any whitespace in .txt
    Object.keys(req.body.review).forEach(key => {
      if (req.body.review[key].txt) {
        req.body.review[key].txt = req.body.review[key].txt.trim();
      }
    });
    // Grab review
    const review = { ...req.body.review };

    // Make sure required fields are present
    if (
      !review.overall ||
      validator.isEmpty(review.overall.txt) ||
      validator.isEmpty(review.overall.rating.toString(), { min: 1, max: 5 })
    ) {
      throw new Error("You must supply a complete overall review");
    }
    if (!review.sauce || validator.isEmpty(review.sauce)) {
      throw new Error("You must tell us which sauce this is a review for");
    }

    // Check txt lengths
    if (!validator.isLength(review.overall.txt, { min: 1, max: MAXLENGTH })) {
      throw new Error(
        "Length for overall is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.label.txt, { max: MAXLENGTH })) {
      throw new Error(
        "Length for label is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.aroma.txt, { max: MAXLENGTH })) {
      throw new Error(
        "Length for aroma is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.taste.txt, { max: MAXLENGTH })) {
      throw new Error(
        "Length for taste is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.heat.txt, { max: MAXLENGTH })) {
      throw new Error(
        "Length for heat is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.note.txt, { max: MAXLENGTH })) {
      throw new Error(
        "Length for note is too long! Must be less than 300 charactors"
      );
    }

    // Check rating val's
    if (
      !validator.isInt(review.overall.rating.toString(), { min: 0, max: 5 })
    ) {
      throw new Error(
        "Rating for overall is too out of range! Must be between 1 and 5."
      );
    }
    if (!validator.isInt(review.label.rating.toString(), { min: 0, max: 5 })) {
      throw new Error(
        "Rating for label is too out of range! Must be between 1 and 5."
      );
    }
    if (!validator.isInt(review.aroma.rating.toString(), { min: 0, max: 5 })) {
      throw new Error(
        "Rating for aroma is too out of range! Must be between 1 and 5."
      );
    }
    if (!validator.isInt(review.taste.rating.toString(), { min: 0, max: 5 })) {
      throw new Error(
        "Rating for taste is too out of range! Must be between 1 and 5."
      );
    }
    if (!validator.isInt(review.heat.rating.toString(), { min: 0, max: 5 })) {
      throw new Error(
        "Rating for heat is too out of range! Must be between 1 and 5."
      );
    }

    // Push slug into req.body.sauce
    req.body.sauce = {};
    req.body.sauce.slug = review.sauce;

    // Keep goin!
    next();
  } catch (err) {
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: err.message
    };
    return res.status(401).send(data);
  }
};

/** @description Add review to DB
 *  @extends req.response attaches review to req.response.sauce OR req.response if sauce doesn't exist
 *  @param {String} req.body.user.UserID - unique user string
 *  @param {String} req.body.sauce.slug - unique sauce string
 *  @param {Object} req.body.review.taste - taste object
 *    @param {String} req.body.review.taste.txt - txt of the taste
 *    @param {Number} req.body.review.taste.rating - 1-10 value
 *  @param {Object} req.body.review.aroma - aroma object
 *    @param {String} req.body.review.aroma.txt - txt of the aroma
 *    @param {Number} req.body.review.aroma.rating - 1-10 value
 *  @param {Object} req.body.review.label - label object
 *    @param {String} req.body.review.label.txt - txt of the label
 *    @param {Number} req.body.review.label.rating - 1-10 value
 *  @param {Object} req.body.review.heat - heat object
 *    @param {String} req.body.review.heat.txt - txt of the heat
 *    @param {Number} req.body.review.heat.rating - 1-10 value
 *  @param {Object} req.body.review.overall - overall object
 *    @param {String} req.body.review.overall.txt - txt of the overall
 *    @param {Number} req.body.review.overall.rating - 1-10 value
 *  @param {Object} req.body.review.note - note obj
 *    @param {Object} req.body.review.note.txt - txt of anything extra
 */
exports.addReview = async (req, res, next) => {
  try {
    const { review } = req.body;
    let { slug } = review;

    // if couldn't find slug or slug is bad, look to see if used the sauce verbiage instead
    if (!slug) {
      slug = review.sauce;

      // Cannot find anything to work with. Reject call.
      if (!slug) {
        const data = {
          isGood: false,
          msg: "Could not find a sauce slug to work with. Please try again."
        };
        return res.status(400).send(data);
      }
    }

    // Find the sauce's ID that we will be working with
    const SauceID = await Sauces.FindIDBySlug({ Slug: slug });

    // save into DB
    const results = await Reviews.Insert({
      UserID: req.body.user.UserID,
      SauceID,
      LabelRating: review.label.rating,
      LabelDescription: review.label.txt,
      AromaRating: review.aroma.rating,
      AromaDescription: review.aroma.txt,
      TasteRating: review.taste.rating,
      TasteDescription: review.taste.txt,
      HeatRating: review.heat.rating,
      HeatDescription: review.heat.txt,
      OverallRating: review.overall.rating,
      OverallDescription: review.overall.txt,
      Note: review.note.txt
    });

    // make sure record is good
    if (!results) {
      const data = {
        isGood: false,
        msg: "Could save your review to the database."
      };
      return res.status(400).send(data);
    }

    // construct return object
    const data = {
      isGood: true
    };

    // Send back successful submission
    return res.status(200).send(data);
  } catch (err) {
    // console.log(err);
    const data = {
      isGood: false,
      msg:
        "Could not save review. Make sure all fields are filled and try again.",
      err
    };
    return res.status(400).send(data);
  }
};

/** @description Edit review in DB
 *  @extends req.response attaches review to req.response.sauce OR req.response if sauce doesn't exist
 *  @param {String} req.body.user.UserID - unique user string
 *  @param {String} req.body.sauce.slug - unique sauce string
 *  @param {Object} req.body.review.taste - taste object
 *    @param {String} req.body.review.taste.txt - txt of the taste
 *    @param {Number} req.body.review.taste.rating - 1-10 value
 *  @param {Object} req.body.review.aroma - aroma object
 *    @param {String} req.body.review.aroma.txt - txt of the aroma
 *    @param {Number} req.body.review.aroma.rating - 1-10 value
 *  @param {Object} req.body.review.label - label object
 *    @param {String} req.body.review.label.txt - txt of the label
 *    @param {Number} req.body.review.label.rating - 1-10 value
 *  @param {Object} req.body.review.heat - heat object
 *    @param {String} req.body.review.heat.txt - txt of the heat
 *    @param {Number} req.body.review.heat.rating - 1-10 value
 *  @param {Object} req.body.review.overall - overall object
 *    @param {String} req.body.review.overall.txt - txt of the overall
 *    @param {Number} req.body.review.overall.rating - 1-10 value
 *  @param {Object} req.body.review.note - note obj
 *    @param {Object} req.body.review.note.txt - txt of anything extra
 */
exports.editReview = async (req, res, next) => {
  try {
    const { review } = req.body;
    let { slug } = review;

    // if couldn't find slug or slug is bad, look to see if used the sauce verbiage instead
    if (!slug) {
      slug = review.sauce;

      // Cannot find anything to work with. Reject call.
      if (!slug) {
        const data = {
          isGood: false,
          msg: "Could not find a sauce slug to work with. Please try again."
        };
        return res.status(400).send(data);
      }
    }

    // Find the sauce's ID that we will be working with
    const SauceID = await Sauces.FindIDBySlug({ Slug: slug });

    // save into DB
    const results = await Reviews.Update({
      UserID: req.body.user.UserID,
      SauceID,
      LabelRating: review.label.rating,
      LabelDescription: review.label.txt,
      AromaRating: review.aroma.rating,
      AromaDescription: review.aroma.txt,
      TasteRating: review.taste.rating,
      TasteDescription: review.taste.txt,
      HeatRating: review.heat.rating,
      HeatDescription: review.heat.txt,
      OverallRating: review.overall.rating,
      OverallDescription: review.overall.txt,
      Note: review.note.txt
    });

    // make sure record is good
    if (!results) {
      const data = {
        isGood: false,
        msg: "Could save your review to the database."
      };
      return res.status(400).send(data);
    }

    // construct return object
    const data = {
      isGood: true
    };

    // Send back successful submission
    return res.status(200).send(data);
  } catch (err) {
    console.log(err);
    const data = {
      isGood: false,
      msg:
        "Could not save review. Make sure all fields are filled and try again.",
      err
    };
    return res.status(400).send(data);
  }
};

/** @description Get all reviews related to specific sauce slug.
 *  @param {Object} req.body.sauce - sauce object
 *  @param {Object} res.locals.sauce - sauce object
 *  @return Attaches reviews to sauce.
 */
exports.getReviewsBySauceSlug = getReviewsBySauceSlug = async (
  req,
  res,
  next
) => {
  // Grab sauce from body
  let { sauce } = req.body;

  // If sauce isn't good, try reassigning.
  if (!sauce || !sauce.slug) {
    sauce = res.locals.sauce;
  }

  // If sauce still not good, send back.
  if (!sauce || !sauce.slug) {
    const data = {
      isGood: false,
      msg:
        "We couldn't find a slug to look up the reviews. Make sure it's in the right place"
    };
    return res.status(300).send(data);
  }

  try {
    // Grab slug from sauce
    const { slug } = sauce;
    // Find SauceID from slug
    const SauceID = await Sauces.FindIDBySlug({ Slug: slug });

    // Find all reviews w/ SauceID
    // If we are getting a single review, pass UserID too.
    const reviews = await Reviews.FindReviewsBySauceID({
      SauceID,
      UserID: req.route.path.includes("/review/get")
        ? res.locals.UserID
        : undefined
    });

    // Attach reviews to sauce obj
    sauce.reviews = [];
    sauce.reviews = reviews;

    // Attach sauce to res.locals
    res.locals.sauce = sauce;

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getReviewsBySauceSlug",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      // send to client
      res.status(200).send({ isGood: true, sauce });

      // finish request off
      next();
    } else {
      // Go to next middleware
      return next();
    }
  } catch (err) {
    console.log(err);
    const data = {
      isGood: false,
      msg:
        "Error finding reviews. Make sure you have passed a legitimate slug and try again."
    };
    return res.status(400).send(data);
  }
};

/** @description Get review _id's based on sauces[] _id
 *  @param {Object[]} req.response.sauces[] - array of sauce objects
 *  @param {String[]} req.response.sauces[]._id - unique sauce string
 *  @return array of reviews _ids attached to each req.response.sauces[] object
 */
exports.getOnlyReviewIDsBySauceID = async (req, res, next) => {
  // make sure req.response.sauces[]._id was actually passed
  if (
    req.response === undefined ||
    req.response.sauces === undefined ||
    req.response.sauces.length === 0 ||
    !req.response.sauces[0]._id
  ) {
    const data = {
      isGood: false,
      msg: "Requires sauce object. Please try again."
    };
    return res.status(300).send(data);
  }

  try {
    // chain of promises all at once.
    // assign reviews[] to each sauces[] object
    req.response.sauces = await Promise.all(
      req.response.sauces.map(async sauce => {
        // find reviews by sauce._id
        // do not populate sauce since we already have that information from previous middleware (sauceControll.getSauceById/getUsers)
        const reviews = await Review.find(
          {
            sauce: sauce._id
          },
          {
            _id: 1
          }
        );

        // turn sauce from mongoose object to object
        const sauceObj = sauce.toObject();

        // assign reviews to sauce
        sauceObj.reviews = reviews.map(x => {
          return x.toObject();
        });

        // return sauce
        return sauceObj;
      })
    );
    // All is good if we made it here.
    // Go to authController.encodeID
    next();
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
};

/** @description Check if user is eligible to add review or not
 *  @extends res.locals attaches canUserSubmit to res.locals or returns with that message
 *  @param {String} req.body.user.UserID - unique user string
 *  @param {String} req.body.sauce.slug - unique sauce string
 *
 *  @return Attaches canUserSubmit to res.locals OR Returns res.locals w/ canUserSubmit
 */
exports.canUserSubmit = canUserSubmit = async (req, res, next) => {
  try {
    // get UserID
    const { UserID } = req.body.user;
    // Try to grab slug off of sauce
    let slug = req.body.sauce ? req.body.sauce.slug : null;
    // If couldn't find slug on sauce, lets try in review
    if (!slug) {
      slug = req.body.review.sauce;
    }

    // If still cant find a slug, end here.
    if (!slug) {
      const data = {
        isGood: false,
        msg:
          "Could not find a slug withing your parameters, please make sure one is provided."
      };
      return res.status(404).send(data);
    }

    // Is user's email confirmed?
    const isEmailConfirmed = Users.IsEmailVerified({ UserID });

    if (!isEmailConfirmed) {
      const data = {
        isGood: false,
        msg:
          "Could not confirm your email. Please verify email before continueing."
      };
      return res.status(404).send(data);
    }

    // Find sauceID
    const SauceID = await Sauces.FindIDBySlug({ Slug: slug });

    // If still cant the SauceID, user has a bad slug
    if (!SauceID) {
      const data = {
        isGood: false,
        msg:
          "Could not find any sauces with that slug, please make sure it's a valid slug and try again."
      };
      return res.status(404).send(data);
    }

    // Does the review exist?
    const doesReviewExist = await Reviews.HasUserSubmittedReview({
      SauceID,
      UserID
    });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "canUserSubmit",
      stack: req.route.stack
    });

    // If we are end of stack, send to client
    if (isLastMiddlewareInStack) {
      // send
      res.status(200).send({
        isGood: !doesReviewExist
      });

      // finish request
      next();
    } else {
      // Go to next middleware
      res.locals.canUserSubmit = !doesReviewExist;
      return next();
    }
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "There was an error in determing if the user can submit a review to this sauce. Make sure your query parameters are correct and try again.",
      err
    };
    return res.status(400).send(data);
  }
};

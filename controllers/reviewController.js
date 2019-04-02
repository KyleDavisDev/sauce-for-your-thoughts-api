const Reviews = require("../models/Reviews.js");
const Sauces = require("../models/Sauces.js");
const validator = require("validator");

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
    if (!review.sauce || validator.isEmpty(review.sauce.slug)) {
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
    req.body.sauce.slug = review.sauce.slug;

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
    // Construct record object -- Bit messy since req.body has nested info and SQL obj is flat
    const { review } = req.body;

    // save into DB
    const results = await Reviews.Insert({
      UserID: req.body.user.UserID,
      SauceID: await Sauces.FindIDBySlug({ Slug: req.body.sauce.slug }),
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

exports.findReviewByUserAndSauce = async (req, res) => {
  try {
    const query = {
      author: req.body.user._id,
      sauce: req.body.sauce._id
    };
    const review = await Review.findOne(query, { _id: 1, rating: 1 });
    if (!review) {
      const data = {
        isGood: false,
        msg: "Could not find sauce."
      };
      return res.status(400).send(data);
    }

    const data = {
      isGood: true,
      msg: "Successfully found sauce."
      // data: { sauce: req.data.sauce }
    };
    return res.status(200).send(data);
  } catch (err) {
    // TODO: Better error handling/loggin
    console.log(err);

    const data = {
      isGood: false,
      msg: "Could not add sauce. Make sure all fields are filled and try again."
    };
    return res.status(400).send(data);
  }
};

/** @description Get all reviews related to specific sauce _id
 *  @param {Object[]} req.body.sauce - sauce object
 *  @param {String[]} req.body.sauce.Slug - unique sauce string
 *  @return array of reviews attached to each req.response.sauces[] object
 */
exports.getReviewsBySauceSlug = async (req, res, next) => {
  // Make sure Slug is in right place
  if (!req.body.sauce || !req.body.sauce.Slug) {
    const data = {
      isGood: false,
      msg:
        "We couldn't find a slug to look up the reviews. Make sure it's in the right place"
    };
    return res.status(300).send(data);
  }

  try {
    // Grab sauce from body
    const { sauce } = req.body;
    // Grab slug from sauce
    const { Slug } = sauce;
    // Find SauceID from Slug
    const SauceID = await Sauces.FindIDBySlug({ Slug });
    // Find all reviews w/ SauceID
    const reviews = await Reviews.FindReviewsBySauceID({ SauceID });

    // Attach reviews to sauce obj
    sauce.reviews = [];
    sauce.reviews = reviews;

    // All is good if we made it here.
    res.status(200).send({ isGood: true, sauce });
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
        sauceObj.reviews = reviews.map(x => x.toObject());

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

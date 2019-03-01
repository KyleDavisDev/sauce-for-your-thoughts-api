const mongoose = require("mongoose");
const Review = mongoose.model("Review");
const validator = require("validator");

exports.validateReview = (req, res, next) => {
  try {
    // Grab review
    const { review } = req.body;
    // Make sure required fields are present
    if (
      !review.overall ||
      validator.isEmpty(review.overall.txt, { min: 1, max: 300 }) ||
      validator.isEmpty(review.overall.rating.toString(), { min: 1, max: 5 })
    ) {
      throw new Error("You must supply a complete overall review");
    }
    if (!review.sauce || validator.isEmpty(review.sauce.slug)) {
      throw new Error("You must tell us which sauce this is a review for");
    }

    // Check txt lengths
    if (!validator.isLength(review.overall.txt, { min: 1, max: 300 })) {
      throw new Error(
        "Length for overall is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.label.txt, { min: 1, max: 300 })) {
      throw new Error(
        "Length for label is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.aroma.txt, { min: 1, max: 300 })) {
      throw new Error(
        "Length for aroma is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.taste.txt, { min: 1, max: 300 })) {
      throw new Error(
        "Length for taste is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.heat.txt, { min: 1, max: 300 })) {
      throw new Error(
        "Length for heat is too long! Must be less than 300 charactors"
      );
    }
    if (!validator.isLength(review.note.txt, { min: 1, max: 300 })) {
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

    // Keep goin!
    next();
  } catch (err) {
    console.log(err.message);
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: err.message
    };
    return res.status(401).send(data);
  }
};

// TODO: Better error handling/logging
/** @description Add review to DB
 *  @extends req.response attaches review to req.response.sauce OR req.response if sauce doesn't exist
 *  @param {String} req.body.user._id - unique user string
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
    // Grab from review
    const record = Object.assign({}, req.body.review);
    record.user = req.body.user;

    // save into DB
    const review = await new Review(record).save();

    // make sure record is good
    if (!review) {
      const data = {
        isGood: false,
        msg:
          "Could save sauce to the database. Please be sure your sauce _id is correct."
      };
      return res.status(400).send(data);
    }

    // construct return object
    const data = {
      isGood: true,
      data: { review }
    };

    return res.status(200).send(data);
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "Could not add sauce. Make sure all fields are filled and try again.",
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
 *  @param {Object[]} req.response.sauces[] - array of sauce objects
 *  @param {String[]} req.response.sauces[]._id - unique sauce string
 *  @return array of reviews attached to each req.response.sauces[] object
 */
exports.getCompleteReviewsBySauceID = async (req, res, next) => {
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
        // do not populate sauce since we already have that information from previous middleware (sauceControll.getSauceById/getSauces)
        const reviews = await Review.find(
          {
            sauce: sauce._id
          },
          {
            sauce: 0,
            created: 0
          }
        ).populate("author", { _id: 1, name: 1 });

        // turn sauce from mongoose object to object
        const sauceObj = sauce.toObject();

        // assign reviews to sauce
        sauceObj.reviews = reviews.map(x =>
          Object.assign({}, x.toObject(), { sauce: { _id: sauce._id } })
        );

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
        // do not populate sauce since we already have that information from previous middleware (sauceControll.getSauceById/getSauces)
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

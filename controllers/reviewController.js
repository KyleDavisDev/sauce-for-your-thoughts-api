const mongoose = require("mongoose");
const Review = mongoose.model("Review");

exports.addReview = async (req, res) => {
  try {
    const record = {
      author: req.body.user._id,
      sauce: req.body.sauce._id,
      text: req.body.review.text || "",
      rating: req.body.review.rating
    };

    const review = await new Review(record).save();

    if (!review) {
      const data = {
        isGood: false,
        msg: "Could not add sauce"
      };
      return res.status(400).send(data);
    }

    const data = {
      isGood: true,
      msg: "Successfully added sauce.",
      data: req.body.return
    };
    return res.status(200).send(data);
  } catch (err) {
    //TODO: Better error handling/loggin

    const data = {
      isGood: false,
      msg: "Could not add sauce. Make sure all fields are filled and try again."
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
    console.log(review);

    const data = {
      isGood: true,
      msg: "Successfully found sauce."
      // data: { sauce: req.data.sauce }
    };
    return res.status(200).send(data);
  } catch (err) {
    //TODO: Better error handling/loggin
    console.log(err);

    const data = {
      isGood: false,
      msg: "Could not add sauce. Make sure all fields are filled and try again."
    };
    return res.status(400).send(data);
  }
};

/** @description Get all reviews related to specific sauce _id
 *  @param Integer Expects sauce._id on req.body
 *  @return array of reviews
 */

exports.findReviewsBySauceID = async (req, res) => {
  //make sure sauce._id was actually passed
  if (!req.body.sauce || !req.body.sauce._id) {
    const data = {
      isGood: false,
      msg: "Requires sauce object. Please try again."
    };
    return res.status(300).send(data);
  }

  try {
    //construct query
    const query = {
      sauce: req.body.sauce._id
    };

    // find reviews by sauce._id
    // do not populate author or sauce since we already have that information from previous middleware (sauceControll.getSauceById)
    const reviews = await Review.find(query, { author: 0, sauce: 0 });

    //attach reviews array to our response object
    req.response.reviews = reviews;

    //construct our final return object
    const data = {
      isGood: true,
      data: req.response
    };

    //send response back
    res.status(200).send(data);
  } catch (err) {
    res.status(400).send(err);
  }
};

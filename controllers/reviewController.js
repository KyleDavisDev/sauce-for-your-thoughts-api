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

    //TODO FIGURE OUT HOW TO TRANSFER DATA BETWEEN MIDDLEWARE
    const temp = Object.assign({}, res.locals.sauce);
    console.log(temp);

    delete res.local.sauce;
    res.locals.sauce = Object.assign({}, temp, {
      rating: review.rating
    });
    console.log("_____________________");
    console.log(res.locals.sauce);

    const data = {
      isGood: true,
      msg: "Successfully found sauce.",
      data: { sauce: req.data.sauce }
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

exports.findReviewsBySauce = async (req, res) => {
  try {
    const query = {
      sauce: req.body.sauce._id
    };
    const reviews = await Review.find(query, { _id: 0 }).populate(
      "author",
      "name"
    );
  } catch (err) {
    res.status(400).send(err);
  }
};

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

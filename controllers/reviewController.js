const mongoose = require("mongoose");
const Review = mongoose.model("Review");

exports.addReview = async (req, res) => {
  try {
    const review = new Review(req.body).save();

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
      sauce: { slug }
    };
    return res.status(200).send(data);
  } catch (err) {}
};

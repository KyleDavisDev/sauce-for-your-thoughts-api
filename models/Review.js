const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  },
  sauce: {
    type: mongoose.Schema.ObjectId,
    ref: "Sauce"
  },
  created: {
    type: Date,
    default: Date.now
  },
  text: {
    type: String
  },
  rating: {
    type: Number,
    required: "You must supply a rating",
    min: 1,
    max: 10
  }
});

// Tells .toObject() to also not include __v
// which is a mongoose housekeeping thing
reviewSchema.set("toObject", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Review", reviewSchema);

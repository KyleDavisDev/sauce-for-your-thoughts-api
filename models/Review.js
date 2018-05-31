const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const mongodbErrorHandler = require("mongoose-mongodb-errors");

// Abstractions since these will be used across multiple methods
const rating = {
  type: Number,
  required: true,
  min: [
    1,
    "You must provide a rating to `{PATH}` and the value must be greater than `{MIN}`"
  ],
  max: [
    5,
    "You must provide a rating to `{PATH}` and the value must be greater than `{MAX}`"
  ]
};
const txt = {
  type: String,
  required: true,
  minlength: [
    1,
    "You must provide text to `{PATH}` with a charactor length greater than `{MINLENGTH}`"
  ],
  maxlength: [
    255,
    "You must provide text to `{PATH}` with a charactor length less than `{MAXLENGTH}`"
  ],
  trim: true
};

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
  label: {
    rating,
    txt
  },
  aroma: {
    rating,
    txt
  },
  taste: {
    rating,
    txt
  },
  heat: {
    rating,
    txt
  },
  overall: {
    rating,
    txt
  },
  note: {
    txt: {
      type: String,
      required: false,
      maxlength: [
        255,
        "You must provide text to `{PATH}` with a charactor length less than `{MAXLENGTH}`"
      ],
      trim: true
    }
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

reviewSchema.plugin(mongodbErrorHandler); // change ugly errors to nice

module.exports = mongoose.model("Review", reviewSchema);

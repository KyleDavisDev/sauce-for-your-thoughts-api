const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// Abstractions since these will be used across multiple methods
const rating = {
  type: Number,
  required: true,
  min: [
    1,
    "You must provide a rating to `{PATH}` and the value must be greater than `{MIN}`"
  ],
  max: [
    10,
    "You must provide a rating to `{PATH}` and the value must be greater than `{MAX}`"
  ]
};
const description = {
  type: String,
  required: true,
  minlength: [
    10,
    "You must provide a description to `{PATH}` with a charactor length greater than `{MINLENGTH}`"
  ],
  maxlength: [
    255,
    "You must provide a description to `{PATH}` with a charactor length less than `{MAXLENGTH}`"
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
    description
  },
  aroma: {
    rating,
    description
  },
  taste: {
    rating,
    description
  },
  heat: {
    rating,
    description
  },
  overall: {
    rating,
    description
  },
  sight: {
    rating,
    description
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

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const mongodbErrorHandler = require("mongoose-mongodb-errors");

const reviewSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  sauce: {
    type: mongoose.Schema.ObjectId,
    ref: "Sauce",
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  label: {
    rating: { type: Number, required: false, min: 0, max: 5 },
    txt: { type: String, required: false, maxlength: 300, trim: true }
  },
  aroma: {
    rating: { type: Number, required: false, min: 0, max: 5 },
    txt: { type: String, required: false, maxlength: 300, trim: true }
  },
  taste: {
    rating: { type: Number, required: false, min: 0, max: 5 },
    txt: { type: String, required: false, maxlength: 300, trim: true }
  },
  heat: {
    rating: { type: Number, required: false, min: 0, max: 5 },
    txt: { type: String, required: false, maxlength: 300, trim: true }
  },
  overall: {
    rating: { type: Number, require: true, min: 0, max: 5 },
    txt: { type: String, required: true, maxlength: 300, trim: true }
  },
  note: {
    txt: { type: String, required: false, maxlength: 300, trim: true }
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

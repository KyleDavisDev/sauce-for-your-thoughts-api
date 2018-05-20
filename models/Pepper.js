const mongoose = require("mongoose");
mongoose.Promise = global.Promise; // ES6 promise

/** @description This will be a basic look-up table.
 *   https://www.cayennediane.com/the-scoville-scale/ for ratings
 */
const pepperSchema = new mongoose.Schema({
  name: {
    type: String,
    required: "Each pepper must have a name."
  },
  shu: {
    type: Number,
    required: "Each pepper must have a SHU rating.",
    min: 1,
    max: 17000000
  }
});

// Tells .toObject() to also not include __v
// which is a mongoose housekeeping thing
pepperSchema.set("toObject", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Pepper", pepperSchema);

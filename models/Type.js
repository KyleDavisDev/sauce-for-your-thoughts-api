const mongoose = require("mongoose");
mongoose.Promise = global.Promise; // ES6 promise

/** @description This will be a basic look-up table.
 *   https://www.cayennediane.com/the-scoville-scale/ for ratings
 */
const typeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

// Tells .toObject() to also not include __v
// which is a mongoose housekeeping thing
typeSchema.set("toObject", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Type", typeSchema);

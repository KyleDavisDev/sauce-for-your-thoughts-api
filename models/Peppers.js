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
  SHU: {
    type: Number,
    required: "Each pepper must have a SHU rating."
  }
});

module.exports = mongoose.model("Pepper", pepperSchema);

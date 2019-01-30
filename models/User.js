const mongoose = require("mongoose");
mongoose.Promise = global.Promise; // surpresses error (?)
const validator = require("validator");
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const passportLocalMongoose = require("passport-local-mongoose"); // takes care of salting pw

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: "Please supply an email address"
  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true,
    unique: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("name")) {
    return next(); // stop rest of function from running
  }

  try {
    // Make sure email is unique
    let user = await this.constructor.find({ email: this.email }).limit(1);
    if (user.length > 0) {
      return next(new Error("Oops! That email is already in use. If this is you, go to the log in page to log in.")); // throw error
    }

    // Make sure name is unique
    user = await this.constructor.find({ name: this.name }).limit(1);
    if (user.length > 0) {
      return next(new Error("Oops! Someone is already using that name. Please try a different one.")); // throw error
    }

    // Keep on chuggin!
    return next();
  } catch (err) {
    // the 'return next()'s' from above should mean that we dont actually make it here if there is an issue
    // Email or name wasn't unique
    next({ message: err.message }, false);
  }
});

// Tells .toObject() to also not include __v
// which is a mongoose housekeeping thing
userSchema.set("toObject", {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
userSchema.plugin(mongodbErrorHandler); // change ugly errors to nice

module.exports = mongoose.model("User", userSchema);

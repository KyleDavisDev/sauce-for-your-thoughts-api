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
    validate: {
      isAsync: true,
      validator: validator.isEmail,
      msg: "Invalid Email Address"
    },
    required: "Please supply an email address"
  },
  name: {
    type: String,
    required: "Please supply a name",
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

userSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next(); // skip checking if unique
    return; // stop function
  }

  try {
    const user = await this.constructor.find({ name: this.name }).limit(1);
    // If another user is found, we need to throw error
    if (user.length > 0) {
      throw new Error("You must supply a unique name");
    }

    // Keep on chuggin!
    next();
  } catch (err) {
    // Name wasn't unique
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

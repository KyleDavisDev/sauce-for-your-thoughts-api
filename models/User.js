const mongoose = require("mongoose");

mongoose.Promise = global.Promise; // surpresses error (?)
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const passportLocalMongoose = require("passport-local-mongoose"); // takes care of salting pw

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 20000;

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
    required: "Please supply a name",
    trim: true,
    unique: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    return next(); // stop rest of function from running
  }

  try {
    // Make sure email is unique
    let user = await this.constructor.find({ email: this.email }).limit(1);
    if (user.length > 0) {
      return next(
        new Error(
          "Oops! That email is already in use. If this is you, go to the log in page to log in."
        )
      ); // throw error
    }

    // Make sure name is unique
    user = await this.constructor.find({ name: this.name }).limit(1);
    if (user.length > 0) {
      return next(
        new Error(
          "Oops! Someone is already using that name. Please try a different one."
        )
      ); // throw error
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

// expose enum on the model
userSchema.statics.failedLogin = {
  NOT_FOUND: 0,
  PASSWORD_INCORRECT: 1,
  MAX_ATTEMPTS: 2
};

// Check if user is locked
userSchema.virtual("isLocked").get(function() {
  // check for a future lockUntil timestamp
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function(cb) {
  // if we have a previous lock that has expired,
  // reset loginAttempts counter and lockedUntil timer
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.update(
      {
        $set: { loginAttempts: 1 },
        $unset: { lockedUntil: 1 }
      },
      cb
    );
  }

  // otherwise we're incrementing
  const updates = { $inc: { loginAttempts: 1 } };
  // lock the account if we've reached max attempts and it's not locked already
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.update(updates, cb);
};

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  attemptsField: "loginAttempts"
});
userSchema.plugin(mongodbErrorHandler); // change ugly errors to nice

module.exports = mongoose.model("User", userSchema);

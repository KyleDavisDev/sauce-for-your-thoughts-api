const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

mongoose.Promise = global.Promise; // surpresses error (?)
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 20000;
const SALT_WORK_FACTOR = 10;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: "Please supply an email address"
  },
  password: { type: String, required: true },
  hash: { type: String, default: "" },
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
  // if (!this.isModified("name")) {
  //   return next(); // stop rest of function from running
  // }

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

// Check if user is locked
userSchema.virtual("isLocked").get(function() {
  // check for a future lockUntil timestamp
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function(cb) {
  // if we have a previous lock that has expired,
  // reset loginAttempts counter and lockedUntil timer
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne(
      {
        $set: { loginAttempts: 1 },
        $unset: { lockedUntil: 1 }
      },
      cb
    );
  }

  // otherwise we need to increase loginAttempts by 1
  const updates = { $inc: { loginAttempts: 1 } };

  // lock the account if we've reached max attempts and it's not locked already
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockedUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates, cb);
};

userSchema.statics.testAuthenticate = function(username, password, cb) {
  // Match email
  this.findOne({ email: username }, function(err, user) {
    // If error occured
    if (err) return cb(err);

    // If cannot find user
    if (!user) {
      return cb(null, null);
    }

    // See if account is locked
    // We will skip hashing password and whatnot if it's locked
    if (user.isLocked) {
      // increment login attempts
      return user.incLoginAttempts(function(err) {
        if (err) return cb(err);
        return cb(null, null);
      });
    }

    bcrypt.compare(password, user.password, function(err, isMatch) {
      if (err) return cb(err);

      if (isMatch) {
        // if there's no lock or failed attempts, just return the user
        if (!user.loginAttempts && !user.lockUntil) return cb(null, user);

        // reset attempts and lock info
        var updates = {
          $set: { loginAttempts: 0 },
          $unset: { lockUntil: 1 }
        };
        return user.updateOne(updates, function(err) {
          if (err) return cb(err);
          return cb(null, user);
        });
      }

      // password is incorrect, so increment login attempts before responding
      user.incLoginAttempts(function(err) {
        if (err) return cb(err);
        return cb(null, null);
      });
    });
  });
};

userSchema.methods.setPassword = async function(password) {
  const user = this;

  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);

    const hash = await bcrypt.hash(password, salt);

    // Save hashed password
    user.password = hash;
  } catch (err) {
    // Bubble error up
    throw Error("Error creating account. Please try again.");
  }
};

userSchema.plugin(mongodbErrorHandler); // change ugly errors to nice

module.exports = mongoose.model("User", userSchema);

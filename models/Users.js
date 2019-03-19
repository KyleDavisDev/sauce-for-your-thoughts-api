var db = require("../db/db.js");
const bcrypt = require("bcrypt");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 1000 * 60 * 60 * 2; // 2 hour lock
const SALT_WORK_FACTOR = 10;

exports.UserTableStructure = `CREATE TABLE IF NOT EXISTS Users (
  UserID int NOT NULL AUTO_INCREMENT,
  Email varchar(50) NOT NULL UNIQUE,
  Password varchar(100) NOT NULL,
  DisplayName varchar(50) NOT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  ResetPasswordToken varchar(300),
  ResetPasswordExpires DATETIME,
  LoginAttempts int DEFAULT 0,
  LockedUntil DATETIME,
  PRIMARY KEY (UserID)
  );`;

exports.UserTableRemove = "DROP TABLE Users";

exports.insert = async function({ email, password, displayName }, cb) {
  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(password, salt);

  // Create insert object
  const values = { Email: email, Password: hash, DisplayName: displayName };

  db.get().query("INSERT INTO Users SET ?", values, function(err, result) {
    // If callback was passed, use that
    if (cb !== undefined) {
      if (err) return cb(err);
      cb(null, result);
    }

    // Otherwise return appropriate val
    if (err) return err;
    return result;
  });
};

exports.getAll = function(cb) {
  db.get().query("SELECT * FROM Users", function(err, rows) {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.getAllByUser = function(userId, cb) {
  db
    .get()
    .query("SELECT * FROM Users WHERE user_id = ?", userId, function(
      err,
      rows
    ) {
      if (err) return cb(err);
      cb(null, rows);
    });
};

exports.AuthenticateUser = function({ email, password }, cb) {
  console.log(email, password);
  db.get().getConnection(function(err, connection) {
    console.log(err);
    connection.query("SELECT * FROM Users", function(err, rows) {
      console.log(err, rows);
    });
  });
  // Find user by email
  // this.findOne({ email: username }, function(err, user) {
  //   // If error occured, get out
  //   if (err) return cb(err, null, null);

  //   // If cannot find user, get out
  //   if (!user) return cb(null, null, null);

  //   // See if account is locked
  //   // We will skip hashing password and whatnot if it's locked
  //   if (user.isLocked) {
  //     // increment login attempts
  //     return user.incLoginAttempts(function(err) {
  //       // If error occured, get out
  //       if (err) return cb(err, null, null);

  //       return cb(
  //         null,
  //         null,
  //         "This account is locked. Please try again in a few hours."
  //       );
  //     });
  //   }

  //   bcrypt.compare(password, user.password, function(err, isMatch) {
  //     // If error occured, get out
  //     if (err) return cb(err, null, null);

  //     // Password is good
  //     if (isMatch) {
  //       // if there's no lock or failed attempts, just return the user
  //       if (!user.loginAttempts && !user.lockedUntil)
  //         return cb(null, user, null);

  //       // reset attempts and remove lockedUntil timer
  //       var updates = {
  //         $set: { loginAttempts: 0 }
  //       };

  //       // remove timer if exists
  //       if (user.lockedUntil) {
  //         updates.$unset = { lockedUntil: 1 };
  //       }

  //       return user.updateOne(updates, function(err) {
  //         // If error, get out
  //         if (err) return cb(err, null, null);

  //         // return user
  //         return cb(null, user, null);
  //       });
  //     }

  //     // password is incorrect, so increment login attempts before responding
  //     user.incLoginAttempts(function(err) {
  //       if (err) return cb(err);
  //       return cb(null, null);
  //     });
  //   });
  // });
};

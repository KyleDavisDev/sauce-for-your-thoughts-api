var db = require("../db.js");
const bcrypt = require("bcrypt");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 1000 * 60 * 60 * 2; // 2 hour lock
const SALT_WORK_FACTOR = 10;

export const UserTableStructure = `CREATE TABLE IF NOT EXISTS Users (
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

export const UserTableRemove = "DROP TABLE Users";

exports.insert = async function({ email, password, displayName }, cb) {
  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(password, salt);

  const values = { Email: email, Password: hash, DisplayName: displayName };

  db.get().query("INSERT INTO Users SET ?", values, function(err, result) {
    if (err) return cb(err);
    cb(null, result.insertId);
  });
};
